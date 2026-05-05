import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Briefcase, Calendar, CheckCircle2, FileText, ChevronRight } from 'lucide-react';

export default function PublicTrackPage() {
  const { token } = useParams<{ token: string }>();
  const [order, setOrder] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (token) {
      fetchOrder(token);
    }
  }, [token]);

  const fetchOrder = async (token: string) => {
    try {
      // Due to RLS, if the policy `USING (true)` is set for public tracking tokens, we can query safely.
      const { data, error } = await supabase
        .from('orders')
        .select('order_code, service_name_snapshot, order_status, payment_status, total_amount, paid_amount, remaining_amount, public_note, created_at, deadline_date, customers(full_name)')
        .eq('tracking_token', token)
        .single();
        
      if (error) throw error;
      setOrder(data);
    } catch (err) {
      console.error(err);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="flex items-center justify-center min-h-screen text-muted-foreground">Loading Tracking Info...</div>;
  if (!order) return <div className="flex items-center justify-center min-h-screen text-destructive">Order not found or tracking link invalid.</div>;

  return (
    <div className="min-h-screen bg-[#f4f2ff] py-8 px-4 sm:px-6 relative overflow-hidden font-sans text-slate-800">
      {/* Frosted Glass Background Blobs */}
      <div className="fixed inset-0 pointer-events-none opacity-40 z-0">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-[#6A0DAD] blur-[120px]"></div>
        <div className="absolute bottom-[-5%] right-[-5%] w-[30%] h-[30%] rounded-full bg-[#FF6A00] blur-[100px]"></div>
      </div>
      
      <div className="max-w-3xl mx-auto space-y-6 relative z-10">
        <div className="flex items-center justify-center gap-2 mb-8 text-primary">
          <Briefcase className="h-8 w-8" />
          <h1 className="text-2xl font-bold">{import.meta.env.NEXT_PUBLIC_COMPANY_NAME || 'Digital Solution Pvt. Ltd.'}</h1>
        </div>

        <Card className="border-t-4 border-t-primary">
          <CardHeader className="pb-4">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-xl">Order Status</CardTitle>
                <div className="text-sm font-medium text-muted-foreground mt-1">ID: {order.order_code}</div>
              </div>
              <div className="text-right">
                <span className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold text-primary">
                  {order.order_status}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Customer Name</div>
                <div className="font-semibold">{order.customers?.full_name}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground">Service Requested</div>
                <div className="font-semibold">{order.service_name_snapshot}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3"/> Order Date</div>
                <div className="font-medium">{new Date(order.created_at).toLocaleDateString()}</div>
              </div>
              <div className="space-y-1">
                <div className="text-sm text-muted-foreground flex items-center gap-1"><Calendar className="w-3 h-3"/> Est. Completion</div>
                <div className="font-medium">{order.deadline_date ? new Date(order.deadline_date).toLocaleDateString() : 'TBD'}</div>
              </div>
            </div>

            <div className="border-t pt-4">
              <h3 className="text-lg font-semibold mb-4">Payment Summary</h3>
              <div className="rounded-lg bg-slate-50 p-4 border">
                <div className="flex justify-between py-1 text-sm">
                  <span className="text-muted-foreground">Total Amount</span>
                  <span className="font-medium">NPR {order.total_amount}</span>
                </div>
                <div className="flex justify-between py-1 text-sm">
                  <span className="text-muted-foreground">Amount Paid</span>
                  <span className="font-medium text-green-600 border-b border-dashed pb-1">NPR {order.paid_amount}</span>
                </div>
                <div className="flex justify-between py-2 text-base font-semibold border-t mt-1">
                  <span>Balance Due</span>
                  <span className={order.remaining_amount > 0 ? "text-destructive" : ""}>NPR {order.remaining_amount}</span>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Status:</span>
                  <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${order.payment_status === 'Unpaid' ? 'bg-red-50 text-red-700 ring-red-600/10' : order.payment_status === 'Fully Paid' ? 'bg-green-50 text-green-700 ring-green-600/20' : 'bg-yellow-50 text-yellow-800 ring-yellow-600/20'}`}>
                    {order.payment_status}
                  </span>
                </div>
              </div>
            </div>

            {order.public_note && (
              <div className="border-t pt-4">
                <h3 className="text-sm font-semibold mb-2 text-muted-foreground">Note from Team:</h3>
                <div className="text-sm p-3 bg-blue-50/50 rounded text-slate-800 border-l-2 border-primary">
                  {order.public_note}
                </div>
              </div>
            )}

            <div className="border-t pt-6 flex justify-center">
               <a href={`https://wa.me/9779800000000`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm font-medium text-primary hover:underline">
                 Contact Support via WhatsApp <ChevronRight className="w-4 h-4" />
               </a>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
