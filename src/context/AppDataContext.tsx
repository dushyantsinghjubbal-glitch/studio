'use client';

import React, { createContext, ReactNode, useEffect, useState } from 'react';
import { useCollection, useFirestore, useMemoFirebase, useUser } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { setDocumentNonBlocking, deleteDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase/non-blocking-updates';
import { usePathname } from 'next/navigation';

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
    depositAmount?: number;
    maintenanceCharge?: number;
    rentDueDate?: Date | null;
    currentTenantId?: string;
    occupancyStatus: 'vacant' | 'occupied' | 'reserved';
    availabilityDate?: Date | null;
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
    propertyAddress: string;
    rentAmount: number;
    depositAmount?: number;
    dueDate: Date;
    netTerms?: number;
    paymentMethod: 'cash' | 'bank' | 'upi' | 'other';
    lastPaymentMonth?: string;
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
        data.rentDueDate = data.rentDueDate || null;
        data.availabilityDate = data.availabilityDate || null;
        return data;
    },
    fromFirestore: (snapshot: any, options: any): Property => {
        const data = snapshot.data(options);
        return {
            id: snapshot.id,
            ...data,
            rentDueDate: data.rentDueDate?.toDate ? data.rentDueDate.toDate() : (data.rentDueDate ? new Date(data.rentDueDate) : null),
            availabilityDate: data.availabilityDate?.toDate ? data.availabilityDate.toDate() : (data.availabilityDate ? new Date(data.availabilityDate) : null),
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
        } as Property;
    }
};

const tenantConverter = {
    toFirestore: (tenant: Omit<Tenant, 'id'> | Tenant) => {
        return {
            ...tenant,
            dueDate: tenant.dueDate,
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
            dueDate: data.dueDate?.toDate ? data.dueDate.toDate() : new Date(data.dueDate),
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
        } as Tenant;
    }
};

const transactionConverter = {
    toFirestore: (transaction: Omit<Transaction, 'id'>) => {
        return {
            ...transaction,
            date: transaction.date,
        };
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
    addTenant: (tenant: Omit<Tenant, 'id' | 'paymentStatus' | 'createdAt' | 'updatedAt' >) => Promise<void>;
    updateTenant: (tenant: Tenant) => Promise<void>;
    removeTenant: (tenantId: string) => Promise<void>;
    properties: Property[];
    addProperty: (property: Omit<Property, 'id' | 'createdAt' | 'updatedAt' >) => Promise<void>;
    updateProperty: (property: Property) => Promise<void>;
    removeProperty: (propertyId: string) => Promise<void>;
    transactions: Transaction[];
    addTransaction: (transaction: Omit<Transaction, 'id'>) => Promise<string | undefined>;
    loading: boolean;
    error: any;
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
    loading: true,
    error: null,
});

const transactionPages = ['/', '/ledger', '/properties/[propertyId]'];

export const AppDataProvider = ({ children }: { children: ReactNode }) => {
    const firestore = useFirestore();
    const { user, isUserLoading } = useUser();
    const pathname = usePathname();
    
    const [shouldFetchTransactions, setShouldFetchTransactions] = useState(false);

    useEffect(() => {
        const isOnTxPage = transactionPages.some(p => {
            if (p.includes('[propertyId]')) {
                return pathname.startsWith('/properties/');
            }
            return p === pathname;
        });
        setShouldFetchTransactions(isOnTxPage);
    }, [pathname, user]);

    // Only set up queries if a user is authenticated
    const tenantsQuery = useMemoFirebase(() => {
        if (!user) return null;
        return collection(firestore, 'tenants').withConverter(tenantConverter);
    }, [firestore, user]);
    
    const propertiesQuery = useMemoFirebase(() => {
        if (!user) return null;
        return collection(firestore, 'properties').withConverter(propertyConverter);
    }, [firestore, user]);

    const transactionsQuery = useMemoFirebase(() => {
        if (!user || !shouldFetchTransactions) return null;
        return collection(firestore, 'transactions').withConverter(transactionConverter);
    }, [firestore, user, shouldFetchTransactions]);

    const { data: tenants, isLoading: tenantsLoading, error: tenantsError } = useCollection<Tenant>(tenantsQuery);
    const { data: properties, isLoading: propertiesLoading, error: propertiesError } = useCollection<Property>(propertiesQuery);
    const { data: transactions, isLoading: transactionsLoading, error: transactionsError } = useCollection<Transaction>(transactionsQuery);
    
    const addTenant = async (tenantData: Omit<Tenant, 'id' | 'paymentStatus' | 'createdAt' | 'updatedAt'>) => {
        const newId = doc(collection(firestore, 'tenants')).id;
        const now = new Date().toISOString();
        const newTenant: Tenant = {
            id: newId,
            ...tenantData,
            paymentStatus: 'due',
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

    const addTransaction = async (transactionData: Omit<Transaction, 'id'>) => {
        const colRef = collection(firestore, 'transactions').withConverter(transactionConverter);
        const dataToSave = {
            ...transactionData,
            propertyId: transactionData.propertyId || null,
            tenantId: transactionData.tenantId || null,
        };
        const docRef = await addDocumentNonBlocking(colRef, dataToSave);
        return docRef?.id;
    };


    const value = {
        tenants: tenants ?? [],
        addTenant,
        updateTenant,
        removeTenant,
        properties: properties ?? [],
        addProperty,
        updateProperty,
        removeProperty,
        transactions: transactions ?? [],
        addTransaction,
        loading: isUserLoading || tenantsLoading || propertiesLoading || transactionsLoading,
        error: tenantsError || propertiesError || transactionsError,
    };

    return (
        <AppDataContext.Provider value={value}>
            {children}
        </AppDataContext.Provider>
    );
};
