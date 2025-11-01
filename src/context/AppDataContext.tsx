'use client';

import React, { createContext, ReactNode, useEffect, useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { setDocumentNonBlocking, deleteDocumentNonBlocking, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { usePathname } from 'next/navigation';
import { add, format, isAfter } from 'date-fns';

export type Property = {
    id: string;
    name: string;
    type: 'shop' | 'flat' | 'land' | 'office';
    category: 'residential' | 'commercial' | 'agricultural';
    areaSize?: string;
    address: string;
    landmark?: string;
    pinCode?: string;
    rentAmount: number;
    maintenanceCharge?: number;
    currentTenantId?: string;
    occupancyStatus: 'vacant' | 'occupied' | 'reserved';
    notes?: string;
    createdAt: string;
    updatedAt: string;
};

export type Tenant = {
    id: string;
    name: string;
    phone?: string;
    email?: string;
    propertyName: string;
    propertyAddress?: string;
    rentAmount: number;
    netTerms?: number;
    paymentMethod: 'cash' | 'bank' | 'upi' | 'other';
    lastPaymentMonth?: string;
    lastReceiptGenerationDate?: string;
    paymentStatus: 'due' | 'paid' | 'partial' | 'overdue';
    lastReceiptUrl?: string;
    lastPaymentDate?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
};

export type Transaction = {
    id: string;
    title: string;
    amount: number;
    type: 'income' | 'expense';
    category: 'Rent Received' | 'Utilities' | 'Maintenance' | 'Salary' | 'Groceries' | 'Other';
    date: string;
    receiptUrl?: string;
    notes?: string;
    tenantId?: string;
    propertyId?: string;
    merchant?: string;
};


// Firestore converters
const propertyConverter = {
    toFirestore: (property: Omit<Property, 'id'> | Property) => {
        const data: any = {
            ...property,
            createdAt: 'createdAt' in property ? property.createdAt : new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
        if ('availabilityDate' in data) delete data.availabilityDate;
        if ('rentDueDate' in data) delete data.rentDueDate;
        if ('depositAmount' in data) delete data.depositAmount;
        return data;
    },
    fromFirestore: (snapshot: any, options: any): Property => {
        const data = snapshot.data(options);
        return {
            id: snapshot.id,
            ...data,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
        } as Property;
    }
};

const tenantConverter = {
    toFirestore: (tenant: Omit<Tenant, 'id'> | Tenant) => {
        const data: any = { ...tenant };
         if ('dueDate' in data) delete data.dueDate;
        return {
            ...data,
            netTerms: tenant.netTerms || 0,
            createdAt: 'createdAt' in tenant ? tenant.createdAt : new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
    },
    fromFirestore: (snapshot: any, options: any): Tenant => {
        const data = snapshot.data(options);
        return {
            id: snapshot.id,
            ...data,
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
        } as Tenant;
    }
};

const transactionConverter = {
    toFirestore: (transaction: Omit<Transaction, 'id'> | Transaction) => {
        const data: any = { ...transaction };
        // Ensure optional fields are handled correctly.
        data.propertyId = transaction.propertyId || null;
        data.tenantId = transaction.tenantId || null;
        data.merchant = transaction.merchant || null;
        // Don't store the File object in Firestore
        if ('receipt' in data && data.receipt === undefined) {
            delete data.receipt;
        }
        return data;
    },
    fromFirestore: (snapshot: any, options: any): Transaction => {
        const data = snapshot.data(options);
        return {
            id: snapshot.id,
            ...data,
        } as Transaction;
    }
};

interface AppDataContextProps {
    tenants: Tenant[];
    addTenant: (tenant: Omit<Tenant, 'id' | 'paymentStatus' | 'createdAt' | 'updatedAt' > & { propertyId?: string }) => Promise<void>;
    updateTenant: (tenant: Tenant) => Promise<void>;
    removeTenant: (tenantId: string) => Promise<void>;
    properties: Property[];
    addProperty: (property: Omit<Property, 'id' | 'createdAt' | 'updatedAt' >) => Promise<void>;
    updateProperty: (property: Property) => Promise<void>;
    removeProperty: (propertyId: string) => Promise<void>;
    transactions: Transaction[];
    addTransaction: (transaction: Omit<Transaction, 'id'> & { receipt?: File }) => Promise<string | undefined>;
    updateTransaction: (transaction: Transaction & { receipt?: File }) => Promise<void>;
    removeTransaction: (transactionId: string) => Promise<void>;
    triggerReceiptGeneration: (tenantId: string, month: string, paymentDate: Date) => Promise<void>;
    loading: boolean;
    error: any;
    isAddTransactionOpen: boolean;
    setAddTransactionOpen: (open: boolean) => void;
    isScanReceiptOpen: boolean;
    setScanReceiptOpen: (open: boolean) => void;
    isGenerateReceiptOpen: boolean;
    setGenerateReceiptOpen: (open: boolean) => void;
    editingTransaction: Transaction | null;
    setEditingTransaction: (transaction: Transaction | null) => void;
    extractedData: Partial<Transaction> | null;
    setExtractedData: (data: Partial<Transaction> | null) => void;
}

export const AppDataContext = createContext<AppDataContextProps>({
    tenants: [],
    addTenant: async () => {},
    updateTenant: async () => {},
    removeTenant: async () => {},
    properties: [],
    addProperty: async () => {},
    updateProperty: async () => {},
    removeProperty: async () => {},
    transactions: [],
    addTransaction: async () => { return undefined; },
    updateTransaction: async () => {},
    removeTransaction: async () => {},
    triggerReceiptGeneration: async () => {},
    loading: true,
    error: null,
    isAddTransactionOpen: false,
    setAddTransactionOpen: () => {},
    isScanReceiptOpen: false,
    setScanReceiptOpen: () => {},
    isGenerateReceiptOpen: false,
    setGenerateReceiptOpen: () => {},
    editingTransaction: null,
    setEditingTransaction: () => {},
    extractedData: null,
    setExtractedData: () => {},
});

const pagesNeedingTransactions = ['/', '/ledger', '/properties/[propertyId]'];
const pagesNeedingTenants = ['/', '/tenants', '/properties', '/properties/[propertyId]', '/ledger'];
const pagesNeedingProperties = ['/', '/tenants', '/properties', '/properties/[propertyId]', '/ledger'];


export const AppDataProvider = ({ children }: { children: ReactNode }) => {
    const firestore = useFirestore();
    const { user, isUserLoading } = useUser();
    const pathname = usePathname();
    
    const [isAddTransactionOpen, setAddTransactionOpen] = useState(false);
    const [isScanReceiptOpen, setScanReceiptOpen] = useState(false);
    const [isGenerateReceiptOpen, setGenerateReceiptOpen] = useState(false);
    const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
    const [extractedData, setExtractedData] = useState<Partial<Transaction> | null>(null);
    const [processedTenants, setProcessedTenants] = useState<Tenant[]>([]);

    const isPage = (patterns: string[]) => {
        return patterns.some(p => {
            if (p.includes('[') && p.includes(']')) {
                const base = p.substring(0, p.indexOf('['));
                return pathname.startsWith(base);
            }
            return p === pathname;
        });
    }

    const shouldFetchTransactions = isPage(pagesNeedingTransactions) || isAddTransactionOpen || isScanReceiptOpen;
    const shouldFetchTenants = isPage(pagesNeedingTenants) || isAddTransactionOpen || isGenerateReceiptOpen;
    const shouldFetchProperties = isPage(pagesNeedingProperties) || isAddTransactionOpen || isGenerateReceiptOpen;

    const tenantsQuery = useMemoFirebase(() => {
        if (!user || !shouldFetchTenants) return null;
        return collection(firestore, 'tenants').withConverter(tenantConverter);
    }, [firestore, user, shouldFetchTenants]);
    
    const propertiesQuery = useMemoFirebase(() => {
        if (!user || !shouldFetchProperties) return null;
        return collection(firestore, 'properties').withConverter(propertyConverter);
    }, [firestore, user, shouldFetchProperties]);

    const transactionsQuery = useMemoFirebase(() => {
        if (!user || !shouldFetchTransactions) return null;
        return collection(firestore, 'transactions').withConverter(transactionConverter);
    }, [firestore, user, shouldFetchTransactions]);

    const { data: tenants, isLoading: tenantsLoading, error: tenantsError } = useCollection<Tenant>(tenantsQuery);
    const { data: properties, isLoading: propertiesLoading, error: propertiesError } = useCollection<Property>(propertiesQuery);
    const { data: transactions, isLoading: transactionsLoading, error: transactionsError } = useCollection<Transaction>(transactionsQuery);
    
    useEffect(() => {
        if (tenants) {
            const now = new Date();
            const updatedTenants = tenants.map(tenant => {
                if (tenant.paymentStatus === 'due' && tenant.lastReceiptGenerationDate) {
                    const dueDate = add(new Date(tenant.lastReceiptGenerationDate), { days: tenant.netTerms || 0 });
                    if (isAfter(now, dueDate)) {
                        return { ...tenant, paymentStatus: 'overdue' };
                    }
                }
                return tenant;
            });
            setProcessedTenants(updatedTenants);
        }
    }, [tenants]);

    const addTenant = async (tenantData: Omit<Tenant, 'id' | 'paymentStatus' | 'createdAt' | 'updatedAt' > & { propertyId?: string }) => {
        const newId = doc(collection(firestore, 'tenants')).id;
        const now = new Date().toISOString();
        const property = properties.find(p => p.id === tenantData.propertyId);
        
        const newTenant: Tenant = {
            id: newId,
            ...tenantData,
            paymentStatus: 'paid', // New tenants start as paid up
            createdAt: now,
            updatedAt: now,
        };
        const tenantRef = doc(firestore, 'tenants', newId).withConverter(tenantConverter);
        setDocumentNonBlocking(tenantRef, newTenant, {});
    };

    const updateTenant = async (tenant: Tenant) => {
        const tenantRef = doc(firestore, 'tenants', tenant.id).withConverter(tenantConverter);
        setDocumentNonBlocking(tenantRef, { ...tenant, updatedAt: new Date().toISOString() }, { merge: true });
    };

    const removeTenant = async (tenantId: string) => {
        const tenantRef = doc(firestore, 'tenants', tenantId);
        deleteDocumentNonBlocking(tenantRef);
    };
    
    const triggerReceiptGeneration = async (tenantId: string, month: string, paymentDate: Date) => {
        const tenant = tenants?.find(t => t.id === tenantId);
        if (tenant) {
            await updateTenant({
                ...tenant,
                paymentStatus: 'due',
                lastPaymentMonth: month,
                lastReceiptGenerationDate: paymentDate.toISOString(),
            });
        }
    };


    const addProperty = async (propertyData: Omit<Property, 'id' | 'createdAt' | 'updatedAt'>) => {
        const newId = doc(collection(firestore, 'properties')).id;
        const now = new Date().toISOString();
        const newProperty: Property = {
            id: newId,
            ...propertyData,
            createdAt: now,
            updatedAt: now,
        };
        const propertyRef = doc(firestore, 'properties', newId).withConverter(propertyConverter);
        setDocumentNonBlocking(propertyRef, newProperty, {});
    };

    const updateProperty = async (property: Property) => {
        const propertyRef = doc(firestore, 'properties', property.id).withConverter(propertyConverter);
        setDocumentNonBlocking(propertyRef, { ...property, updatedAt: new Date().toISOString() }, { merge: true });
    };

    const removeProperty = async (propertyId: string) => {
        const propertyRef = doc(firestore, 'properties', propertyId);
        deleteDocumentNonBlocking(propertyRef);
    };

    const addTransaction = async (transactionData: Omit<Transaction, 'id'> & { receipt?: File }) => {
        const dataToSave: Partial<typeof transactionData> = { ...transactionData };
        if ('receipt' in dataToSave && !dataToSave.receipt) {
            delete dataToSave.receipt;
        }

        const colRef = collection(firestore, 'transactions').withConverter(transactionConverter);
        const docRef = await addDocumentNonBlocking(colRef, dataToSave);

        // If it's a rent payment, update the tenant status
        if (dataToSave.category === 'Rent Received' && dataToSave.tenantId) {
            const tenant = tenants?.find(t => t.id === dataToSave.tenantId);
            if (tenant) {
                const paymentMonth = format(new Date(dataToSave.date as string), 'MMMM');
                await updateTenant({ 
                    ...tenant, 
                    paymentStatus: 'paid', 
                    lastPaymentDate: dataToSave.date,
                    lastPaymentMonth: paymentMonth,
                });
            }
        }

        // TODO: Handle receipt file upload if present
        return docRef?.id;
    };

    const updateTransaction = async (transactionData: Transaction & { receipt?: File }) => {
        const docRef = doc(firestore, 'transactions', transactionData.id).withConverter(transactionConverter);
         // The converter will handle removing the 'receipt' field if it exists
        updateDocumentNonBlocking(docRef, transactionData);
        // TODO: Handle receipt file upload if present
    };



    const removeTransaction = async (transactionId: string) => {
        const docRef = doc(firestore, 'transactions', transactionId);
        deleteDocumentNonBlocking(docRef);
    };

    const getLoadingState = () => {
        if (isUserLoading) return true;
        if (shouldFetchTenants && tenantsLoading) return true;
        if (shouldFetchProperties && propertiesLoading) return true;
        if (shouldFetchTransactions && transactionsLoading) return true;
        return false;
    }

    const value = {
        tenants: processedTenants,
        addTenant,
        updateTenant,
        removeTenant,
        triggerReceiptGeneration,
        properties: properties ?? [],
        addProperty,
        updateProperty,
        removeProperty,
        transactions: transactions ?? [],
        addTransaction,
        updateTransaction,
        removeTransaction,
        loading: getLoadingState(),
        error: tenantsError || propertiesError || transactionsError,
        isAddTransactionOpen,
        setAddTransactionOpen,
        isScanReceiptOpen,
        setScanReceiptOpen,
        isGenerateReceiptOpen,
        setGenerateReceiptOpen,
        editingTransaction,
        setEditingTransaction,
        extractedData,
        setExtractedData,
    };

    return (
        <AppDataContext.Provider value={value}>
            {children}
        </AppDataContext.Provider>
    );
};
