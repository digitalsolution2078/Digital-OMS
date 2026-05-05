import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

// Since we are mocking PDF generation for MVP, jsPDF is used directly
export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [order, setOrder] = useState<any>(null);
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (id) fetchOrderDetails();
  }, [id]);

  const fetchOrderDetails = async () => {
    setLoading(true);
    // Fetch order
    const { data: oData, error } = await supabase
      .from('orders')
      .select('*, customers(*), services(service_name)')
      .eq('id', id)
      .single();

    if (error) {
      toast.error('Failed to load order');
      navigate('/orders');
      return;
    }

    setOrder(oData);

    // Fetch payments
    const { data: pData } = await supabase
      .from('payments')
      .select('*')
      .eq('order_id', id)
      .order('payment_date', { ascending: false });

    setPayments(pData || []);
    setLoading(false);
  };

  const handleAddPaymentMock = async () => {
    // In a full app, this opens a modal. Here we simulate adding a fast 500 payment.
    const amount = 500;
    try {
      const { data: { user } } = await supabase.auth.getUser();
      // Insert payment
      await supabase.from('payments').insert([{
        order_id: id,
        amount_received: amount,
        payment_method: 'Cash',
        payment_date: new Date().toISOString().split('T')[0],
        received_by: user?.id,
      }]);

      // Update order totals
      const newPaid = Number(order.paid_amount) + amount;
      const newRemaining = Number(order.total_amount) - newPaid;
      let newPaymentStatus = 'Partially Paid';
      if (newRemaining <= 0) newPaymentStatus = 'Fully Paid';

      await supabase.from('orders').update({
        paid_amount: newPaid,
        remaining_amount: newRemaining,
        payment_status: newPaymentStatus
      }).eq('id', id);

      toast.success('Payment recorded');
      fetchOrderDetails();
    } catch (e: any) {
      toast.error('Payment failed');
    }
  };

  const generateReceiptPDF = (payment?: any) => {
    const doc = new jsPDF();
    const companyName = import.meta.env.NEXT_PUBLIC_COMPANY_NAME || "Digital Solution Pvt. Ltd.";
    
    // Header
    doc.setFontSize(22);
    doc.setTextColor(106, 13, 173); // Brand Purple
    doc.text(companyName, 20, 20);
    doc.setFontSize(14);
    doc.setTextColor(50, 50, 50);
    doc.text('Payment Received Slip', 20, 30);
    
    doc.setFontSize(10);
    doc.text(`Receipt No: RCPT-DS-${order.order_code}`, 130, 20);
    doc.text(`Date: ${format(new Date(), 'yyyy-MM-dd')}`, 130, 28);
    
    // Divide Line
    doc.setDrawColor(200, 200, 200);
    doc.line(20, 35, 190, 35);

    // Customer & Order Info
    doc.setFontSize(12);
    doc.text('Bill To:', 20, 45);
    doc.setFontSize(10);
    doc.text(`Name: ${order.customers?.full_name}`, 20, 52);
    doc.text(`WhatsApp: ${order.customers?.whatsapp_number}`, 20, 58);
    
    doc.text('Order Info:', 130, 45);
    doc.text(`Order Code: ${order.order_code}`, 130, 52);
    doc.text(`Service: ${order.service_name_snapshot}`, 130, 58);

    // Amounts Table
    autoTable(doc, {
      startY: 70,
      head: [['Description', 'Amount (NPR)']],
      body: [
        ['Total Service Amount', Number(order.total_amount).toFixed(2)],
        ['Previously Paid', (Number(order.paid_amount) - (payment ? Number(payment.amount_received) : 0)).toFixed(2)],
        ['Current Payment', payment ? Number(payment.amount_received).toFixed(2) : Number(order.paid_amount).toFixed(2)],
        ['Remaining Balance', Number(order.remaining_amount).toFixed(2)],
      ],
      theme: 'grid',
      headStyles: { fillColor: [106, 13, 173] },
    });

    // Footer
    const finalY = (doc as any).lastAutoTable.finalY || 130;
    doc.text('Thank you for your business.', 20, finalY + 20);
    
    const trackingUrl = `${window.location.origin}/track/${order.tracking_token}`;
    doc.setTextColor(0, 0, 255);
    doc.textWithLink('Track your order online', 20, finalY + 30, { url: trackingUrl });

    doc.save(`Receipt_${order.order_code}.pdf`);
    toast.success('Receipt generated and downloaded.');
  };

  if (loading || !order) return <div className="p-8 text-center text-muted-foreground">Loading...</div>;

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-3xl font-bold tracking-tight">Order {order.order_code}</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => window.open(`/track/${order.tracking_token}`, '_blank')}>View Tracking Link</Button>
          <Button onClick={() => generateReceiptPDF()}>Generate Full Receipt</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Main Details */}
        <div className="md:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="grid sm:grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-muted-foreground">Service:</span>
                <p className="font-medium text-base">{order.service_name_snapshot}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Status:</span>
                <div><Badge variant="outline">{order.order_status}</Badge></div>
              </div>
              <div>
                <span className="text-muted-foreground">Priority:</span>
                <p>{order.priority}</p>
              </div>
              <div>
                <span className="text-muted-foreground">Created At:</span>
                <p>{format(new Date(order.created_at), 'PPP')}</p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Payment Records</CardTitle>
              <Button size="sm" onClick={handleAddPaymentMock}>+ Add 500 NPR (Quick Demo)</Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Method</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead className="text-right">Receipt</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center">No payments recorded</TableCell></TableRow>
                  ) : payments.map(p => (
                    <TableRow key={p.id}>
                      <TableCell>{format(new Date(p.payment_date), 'MMM dd, yyyy')}</TableCell>
                      <TableCell>{p.payment_method}</TableCell>
                      <TableCell className="font-medium text-green-600">NPR {p.amount_received}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => generateReceiptPDF(p)}>PDF</Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        {/* Sidebar Info */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Customer Details</CardTitle>
            </CardHeader>
            <CardContent className="text-sm space-y-2">
              <p><strong>Name:</strong> {order.customers?.full_name}</p>
              <p><strong>WhatsApp:</strong> {order.customers?.whatsapp_number}</p>
              {order.customers?.email && <p><strong>Email:</strong> {order.customers?.email}</p>}
            </CardContent>
          </Card>

          <Card className="bg-slate-50 border-primary/20">
            <CardHeader className="pb-2">
              <CardTitle className="text-lg">Financials</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Total:</span>
                <span className="font-medium">NPR {order.total_amount}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Paid:</span>
                <span className="font-medium text-green-600">NPR {order.paid_amount}</span>
              </div>
              <div className="flex justify-between border-t pt-2 font-bold">
                <span>Remaining:</span>
                <span className={order.remaining_amount > 0 ? "text-destructive" : ""}>NPR {order.remaining_amount}</span>
              </div>
              <div className="pt-2 text-right">
                <Badge variant={order.payment_status === 'Fully Paid' ? 'default' : 'secondary'}>
                  {order.payment_status}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
