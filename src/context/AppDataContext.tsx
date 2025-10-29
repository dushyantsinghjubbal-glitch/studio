'use client';

import React, { createContext, ReactNode, useEffect } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc } from 'firebase/firestore';
import { setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';

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
    rentDueDate?: Date;
    currentTenantId?: string;
    occupancyStatus: 'vacant' | 'occupied' | 'reserved';
    availabilityDate?: Date;
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
    paymentMethod: 'cash' | 'bank' | 'upi' | 'other';
    lastPaymentMonth?: string;
    paymentStatus: 'due' | 'paid' | 'partial';
    lastReceiptUrl?: string;
    lastPaymentDate?: string;
    notes?: string;
    createdAt: string;
    updatedAt: string;
};


// Firestore converters
const propertyConverter = {
    toFirestore: (property: Omit<Property, 'id'>) => {
        return {
            ...property,
            createdAt: property.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
    },
    fromFirestore: (snapshot: any, options: any): Property => {
        const data = snapshot.data(options);
        return {
            id: snapshot.id,
            ...data,
            rentDueDate: data.rentDueDate?.toDate ? data.rentDueDate.toDate() : (data.rentDueDate ? new Date(data.rentDueDate) : undefined),
            availabilityDate: data.availabilityDate?.toDate ? data.availabilityDate.toDate() : (data.availabilityDate ? new Date(data.availabilityDate) : undefined),
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
        } as Property;
    }
};

const tenantConverter = {
    toFirestore: (tenant: Omit<Tenant, 'id'>) => {
        return {
            ...tenant,
            dueDate: tenant.dueDate,
            createdAt: tenant.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };
    },
    fromFirestore: (snapshot: any, options: any): Tenant => {
        const data = snapshot.data(options);
        return {
            id: snapshot.id,
            ...data,
            dueDate: data.dueDate.toDate ? data.dueDate.toDate() : new Date(data.dueDate),
            createdAt: data.createdAt,
            updatedAt: data.updatedAt,
        } as Tenant;
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
    loading: true,
    error: null,
});

export const AppDataProvider = ({ children }: { children: ReactNode }) => {
    const firestore = useFirestore();

    const tenantsQuery = useMemoFirebase(() => collection(firestore, 'tenants').withConverter(tenantConverter), [firestore]);
    const propertiesQuery = useMemoFirebase(() => collection(firestore, 'properties').withConverter(propertyConverter), [firestore]);

    const { data: tenants = [], isLoading: tenantsLoading, error: tenantsError } = useCollection<Tenant>(tenantsQuery);
    const { data: properties = [], isLoading: propertiesLoading, error: propertiesError } = useCollection<Property>(propertiesQuery);

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

    const value = {
        tenants: tenants ?? [],
        addTenant,
        updateTenant,
        removeTenant,
        properties: properties ?? [],
        addProperty,
        updateProperty,
        removeProperty,
        loading: tenantsLoading || propertiesLoading,
        error: tenantsError || propertiesError,
    };

    return (
        <AppDataContext.Provider value={value}>
            {children}
        </AppDataContext.Provider>
    );
};
