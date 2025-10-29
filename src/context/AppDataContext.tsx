'use client';

import React, { createContext, useState, ReactNode, Dispatch, SetStateAction, useEffect } from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, doc, setDoc, deleteDoc } from 'firebase/firestore';
import { setDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase/non-blocking-updates';

export type Property = {
  id: string;
  name: string;
  type: 'apartment' | 'shop';
};

export type Tenant = {
  id: string;
  name: string;
  avatar: string;
  rent: number;
  status: 'paid' | 'pending';
  dueDate: Date;
  whatsappNumber?: string;
  propertyId: string;
};

// Firestore converters
const propertyConverter = {
    toFirestore: (property: Property) => {
        return {
            name: property.name,
            type: property.type,
        };
    },
    fromFirestore: (snapshot: any, options: any) => {
        const data = snapshot.data(options);
        return { id: snapshot.id, ...data } as Property;
    }
};

const tenantConverter = {
    toFirestore: (tenant: Tenant) => {
        return {
            name: tenant.name,
            avatar: tenant.avatar,
            rent: tenant.rent,
            status: tenant.status,
            dueDate: tenant.dueDate,
            whatsappNumber: tenant.whatsappNumber,
            propertyId: tenant.propertyId,
        };
    },
    fromFirestore: (snapshot: any, options: any) => {
        const data = snapshot.data(options);
        return { 
            id: snapshot.id, 
            ...data,
            dueDate: data.dueDate.toDate(), // Convert Firestore Timestamp to Date
        } as Tenant;
    }
};


interface AppDataContextProps {
    tenants: Tenant[];
    addTenant: (tenant: Omit<Tenant, 'id' | 'status' | 'avatar'>) => Promise<void>;
    updateTenant: (tenant: Tenant) => Promise<void>;
    removeTenant: (tenantId: string) => Promise<void>;
    properties: Property[];
    addProperty: (property: Omit<Property, 'id'>) => Promise<void>;
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

    const addTenant = async (tenantData: Omit<Tenant, 'id' | 'status' | 'avatar'>) => {
        const newId = doc(collection(firestore, 'tenants')).id;
        const newTenant: Tenant = {
            id: newId,
            ...tenantData,
            status: 'pending',
            avatar: `https://i.pravatar.cc/150?u=${newId}`,
        };
        const tenantRef = doc(firestore, 'tenants', newId).withConverter(tenantConverter);
        setDocumentNonBlocking(tenantRef, newTenant, {});
    };

    const updateTenant = async (tenant: Tenant) => {
        const tenantRef = doc(firestore, 'tenants', tenant.id).withConverter(tenantConverter);
        setDocumentNonBlocking(tenantRef, tenant, { merge: true });
    };

    const removeTenant = async (tenantId: string) => {
        const tenantRef = doc(firestore, 'tenants', tenantId);
        deleteDocumentNonBlocking(tenantRef);
    };

    const addProperty = async (propertyData: Omit<Property, 'id'>) => {
        const newId = doc(collection(firestore, 'properties')).id;
        const newProperty: Property = { id: newId, ...propertyData };
        const propertyRef = doc(firestore, 'properties', newId).withConverter(propertyConverter);
        setDocumentNonBlocking(propertyRef, newProperty, {});
    };

    const updateProperty = async (property: Property) => {
        const propertyRef = doc(firestore, 'properties', property.id).withConverter(propertyConverter);
        setDocumentNonBlocking(propertyRef, property, { merge: true });
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
