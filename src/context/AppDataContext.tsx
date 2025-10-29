'use client';

import React, { createContext, useState, ReactNode, Dispatch, SetStateAction } from 'react';

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

const initialProperties: Property[] = [
    { id: '1', name: 'Apt 101, Sunrise Building', type: 'apartment' },
    { id: '2', name: 'Groceries R Us', type: 'shop' },
    { id: '3', name: 'Apt 202, Sunrise Building', type: 'apartment' },
    { id: '4', name: 'The Corner Bookstore', type: 'shop' },
];

const initialTenants: Tenant[] = [
  { id: '1', name: 'John Doe', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026024d', rent: 1200, status: 'paid', dueDate: new Date('2024-07-01'), whatsappNumber: '1234567890', propertyId: '1' },
  { id: '2', name: 'Jane Smith', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026704d', rent: 950, status: 'pending', dueDate: new Date('2024-07-05'), whatsappNumber: '0987654321', propertyId: '2' },
  { id: '3', name: 'Sam Wilson', avatar: 'https://i.pravatar.cc/150?u=a04258114e29026702d', rent: 1500, status: 'paid', dueDate: new Date('2024-07-03'), propertyId: '3' },
  { id: '4', name: 'Alice Johnson', avatar: 'https://i.pravatar.cc/150?u=a042581f4e29026706d', rent: 1100, status: 'pending', dueDate: new Date('2024-07-10'), whatsappNumber: '1122334455', propertyId: '4' },
];

interface AppDataContextProps {
    tenants: Tenant[];
    setTenants: Dispatch<SetStateAction<Tenant[]>>;
    properties: Property[];
    setProperties: Dispatch<SetStateAction<Property[]>>;
}

export const AppDataContext = createContext<AppDataContextProps>({
    tenants: initialTenants,
    setTenants: () => {},
    properties: initialProperties,
    setProperties: () => {},
});

export const AppDataProvider = ({ children }: { children: ReactNode }) => {
    const [tenants, setTenants] = useState<Tenant[]>(initialTenants);
    const [properties, setProperties] = useState<Property[]>(initialProperties);

    return (
        <AppDataContext.Provider value={{ tenants, setTenants, properties, setProperties }}>
            {children}
        </AppDataContext.Provider>
    );
};
