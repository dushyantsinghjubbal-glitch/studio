'use client';

import React, { useEffect, useRef } from 'react';
import type { Tenant, Property } from '@/context/AppDataContext';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';

interface PendingReceiptProps {
  tenant: Tenant;
  property?: Property | null;
  onRendered?: () => void;
}

export const PendingReceipt: React.FC<PendingReceiptProps> = ({ tenant, property, onRendered }) => {
  const receiptRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const link = document.createElement('link');
    link.href = "https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap";
    link.rel = "stylesheet";
    document.head.appendChild(link);
    
    if (onRendered) {
        onRendered();
    }

    return () => {
      document.head.removeChild(link);
    };
  }, [onRendered]);

  const handleGeneratePdf = async () => {
    const element = receiptRef.current;
    if (!element) return;

    const html2pdf = (await import('html2pdf.js')).default;
    
    const opt = {
      margin: 0.5,
      filename: `Rent_Receipt_${tenant.name}_${format(new Date(), 'yyyy-MM')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { unit: 'in', format: 'a5', orientation: 'portrait' }
    };
    
    html2pdf().set(opt).from(element).save();
  };

  return (
    <>
      <style jsx global>{`
        .receipt-container {
          font-family: 'Poppins', sans-serif;
          background-color: #f5f7fa;
          margin: 0;
          padding: 20px;
          color: #333;
        }

        .receipt {
          max-width: 600px;
          background: #ffffff;
          margin: 20px auto;
          padding: 20px;
          border-radius: 12px;
          box-shadow: 0 4px 10px rgba(0,0,0,0.1);
        }

        .header {
          text-align: center;
          background-color: hsl(var(--primary));
          color: hsl(var(--primary-foreground));
          padding: 15px;
          border-radius: 8px;
        }

        .header h1 {
          margin: 0;
          font-size: 22px;
          font-weight: 600;
        }

        .section {
          margin-top: 20px;
        }

        .section-title {
          font-weight: 600;
          border-bottom: 2px solid #e0e0e0;
          margin-bottom: 8px;
          color: hsl(var(--primary));
          padding-bottom: 4px;
          font-size: 16px;
        }

        .receipt-table {
          width: 100%;
          border-collapse: collapse;
          margin-top: 8px;
        }

        .receipt-table td {
          padding: 8px 6px;
          border-bottom: 1px solid #eee;
          font-size: 14px;
        }
        
        .receipt-table tr:last-child td {
            border-bottom: none;
        }
        
        .receipt-table td:first-child {
            font-weight: 600;
            color: #555;
        }

        .warning {
          background-color: #fff5f5;
          color: #d32f2f;
          padding: 12px;
          border-radius: 8px;
          margin-top: 15px;
          font-weight: 500;
          font-size: 14px;
          border-left: 4px solid #d32f2f;
        }

        .remarks {
          background-color: #f1f8e9;
          padding: 12px;
          border-radius: 8px;
          margin-top: 15px;
          font-size: 14px;
          border-left: 4px solid #8bc34a;
        }

        .footer {
          text-align: center;
          font-size: 12px;
          color: #777;
          margin-top: 20px;
          padding-top: 15px;
          border-top: 1px solid #eee;
        }
      `}</style>
      <div className="receipt-container">
        <div id="receipt" ref={receiptRef} className="receipt">
          <div className="header">
            <h1>🏠 RENT RECEIPT (Pending Payment)</h1>
          </div>

          <div className="section">
            <div className="section-title">Property Owner</div>
            <table className="receipt-table">
              <tbody>
                <tr><td>Name:</td><td>Dushyant Singh</td></tr>
                <tr><td>Address:</td><td>Nerwa, Tehsil Nerwa, Shimla (HP)</td></tr>
              </tbody>
            </table>
          </div>

          <div className="section">
            <div className="section-title">Tenant Details</div>
            <table className="receipt-table">
              <tbody>
                <tr><td>Name:</td><td>{tenant.name}</td></tr>
                <tr><td>Property:</td><td>{tenant.propertyName}</td></tr>
                {property?.type && <tr><td>Type:</td><td>{property.type}</td></tr>}
                {property?.areaSize && <tr><td>Area:</td><td>{property.areaSize}</td></tr>}
              </tbody>
            </table>
          </div>

          <div className="section">
            <div className="section-title">Payment Details</div>
            <table className="receipt-table">
              <tbody>
                <tr><td>Month:</td><td>{format(new Date(tenant.dueDate), 'MMMM yyyy')}</td></tr>
                <tr><td>Rent Amount:</td><td>${tenant.rentAmount.toLocaleString()}</td></tr>
                <tr><td>Status:</td><td>❌ Pending</td></tr>
                <tr><td>Due Date:</td><td>{format(new Date(tenant.dueDate), 'dd-MMM-yyyy')}</td></tr>
                <tr><td>Payment Mode:</td><td>Not Paid</td></tr>
              </tbody>
            </table>
          </div>

          <div className="warning">
            ⚠️ Please make the payment as soon as possible to avoid any extra charges.
          </div>

          {tenant.notes && (
            <div className="remarks">
              <strong>Remarks:</strong> {tenant.notes}
            </div>
          )}

          <div className="section" style={{ marginTop: '25px', fontSize: '14px' }}>
            <strong>Owner Signature:</strong> _____________________<br /><br />
            <strong>Date:</strong> {format(new Date(), 'dd-MMM-yyyy')}
          </div>

          <div className="footer">
            Auto-generated via Expro
          </div>
        </div>
        
        <Button onClick={handleGeneratePdf} className="w-full mt-4">
          📄 Download PDF
        </Button>
      </div>
    </>
  );
};
