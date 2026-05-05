import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/auth-provider';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Search, Eye } from 'lucide-react';
import { toast } from 'sonner';
import { getDefaultNepaliDate } from '@/lib/utils';
import { useNavigate } from 'react-router-dom';

export default function OrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [services, setServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [isAddOpen, setIsAddOpen] = useState(false);
  
  const { user } = useAuth();
  const navigate = useNavigate();
  const { year, month } = getDefaultNepaliDate();

  const [formData, setFormData] = useState({
    customer_id: '',
    service_id: '',
    priority: 'Normal',
    total_amount: ''
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    
    // Fetch orders
    let query = supabase.from('orders').select('*, customers(full_name, whatsapp_number), services(service_name)').is('deleted_at', null).order('created_at', { ascending: false });
    if (search) {
      query = query.or(`order_code.ilike.%${search}%`);
      // Note: searching across joined tables is a bit trickier, ignoring for simple MVP. 
    }
    const { data: oData } = await query;
    setOrders(oData || []);

    // Fetch dependencies for form
    const { data: cData } = await supabase.from('customers').select('*');
    const { data: sData } = await supabase.from('services').select('*').eq('status', 'active');
    
    setCustomers(cData || []);
    setServices(sData || []);
    setLoading(false);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchData();
  };

  const generateOrderCodeAndSequence = async (y: number, m: number) => {
    // Get the highest sequence for this year-month
    const { data, error } = await supabase
      .from('orders')
      .select('monthly_sequence')
      .eq('nepali_year', y)
      .eq('nepali_month', m)
      .order('monthly_sequence', { ascending: false })
      .limit(1);

    const nextSeq = (data && data.length > 0) ? data[0].monthly_sequence + 1 : 1;
    // Format DS + Y_last_digit + M + - + SEQ(3 digits)
    const yStr = String(y).slice(-1);
    const mStr = String(m);
    const seqStr = String(nextSeq).padStart(3, '0');
    return {
      monthly_sequence: nextSeq,
      order_code: `DS${yStr}${mStr}-${seqStr}`
    };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const { monthly_sequence, order_code } = await generateOrderCodeAndSequence(year, month);
      
      const service = services.find(s => s.id === formData.service_id);
      if (!service) throw new Error("Service not found");

      const tracking_token = crypto.randomUUID().replace(/-/g, '').substring(0, 16);

      const newOrder = {
        order_code,
        customer_id: formData.customer_id,
        service_id: formData.service_id,
        service_name_snapshot: service.service_name,
        nepali_year: year,
        nepali_month: month,
        monthly_sequence,
        total_amount: parseFloat(formData.total_amount),
        paid_amount: 0,
        remaining_amount: parseFloat(formData.total_amount),
        order_status: 'New Order',
        payment_status: 'Unpaid',
        priority: formData.priority,
        tracking_token,
        created_by: user?.id,
      };

      const { data, error } = await supabase.from('orders').insert([newOrder]).select();
      if (error) throw error;
      
      toast.success('Order created successfully: ' + order_code);
      setIsAddOpen(false);
      setFormData({ customer_id: '', service_id: '', priority: 'Normal', total_amount: '' });
      fetchData();
      
      // Optionally navigate to the detail page
      // navigate(`/orders/${data[0].id}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to create order');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Orders</h2>
          <p className="text-muted-foreground">Manage and track customer service orders.</p>
        </div>
        
        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Order
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Order</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="grid gap-2">
                <Label htmlFor="customer_id">Customer *</Label>
                <Select value={formData.customer_id} onValueChange={(val) => setFormData({...formData, customer_id: val})} required>
                  <SelectTrigger id="customer_id">
                    <SelectValue placeholder="Select Customer" />
                  </SelectTrigger>
                  <SelectContent>
                    {customers.map(c => (
                      <SelectItem key={c.id} value={c.id}>{c.full_name} ({c.whatsapp_number})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid gap-2">
                <Label htmlFor="service_id">Service *</Label>
                <Select 
                  value={formData.service_id} 
                  onValueChange={(val) => {
                    const svc = services.find(s => s.id === val);
                    setFormData({...formData, service_id: val, total_amount: svc?.default_price?.toString() || ''});
                  }} 
                  required
                >
                  <SelectTrigger id="service_id">
                    <SelectValue placeholder="Select Service" />
                  </SelectTrigger>
                  <SelectContent>
                    {services.map(s => (
                      <SelectItem key={s.id} value={s.id}>{s.service_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="total_amount">Total Amount (NPR) *</Label>
                <Input 
                  id="total_amount" 
                  type="number"
                  value={formData.total_amount} 
                  onChange={(e) => setFormData({...formData, total_amount: e.target.value})} 
                  required 
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="priority">Priority</Label>
                <Select value={formData.priority} onValueChange={(val) => setFormData({...formData, priority: val})}>
                  <SelectTrigger id="priority">
                    <SelectValue placeholder="Select Priority" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Normal">Normal</SelectItem>
                    <SelectItem value="Urgent">Urgent</SelectItem>
                    <SelectItem value="Very Urgent">Very Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex justify-end pt-4">
                <Button type="submit">Create Order</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex items-center space-x-2">
        <form onSubmit={handleSearch} className="flex flex-1 max-w-sm items-center space-x-2">
          <Input 
            placeholder="Search by order code..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <Button type="submit" variant="secondary" size="icon">
            <Search className="h-4 w-4" />
          </Button>
        </form>
      </div>

      <div className="bg-white/70 backdrop-blur-md border border-white/40 rounded-2xl shadow-lg overflow-hidden">
        <Table>
          <TableHeader className="bg-slate-50/50">
            <TableRow>
              <TableHead>Order Code</TableHead>
              <TableHead>Customer</TableHead>
              <TableHead>Service</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Payment</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8">Loading...</TableCell>
              </TableRow>
            ) : orders.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">No orders found.</TableCell>
              </TableRow>
            ) : (
              orders.map((o) => (
                <TableRow key={o.id}>
                  <TableCell className="font-medium text-primary">{o.order_code}</TableCell>
                  <TableCell>{o.customers?.full_name}</TableCell>
                  <TableCell>{o.service_name_snapshot}</TableCell>
                  <TableCell>
                    <span className="inline-flex items-center rounded-md bg-blue-50 px-2 py-1 text-xs font-medium text-blue-700 ring-1 ring-inset ring-blue-700/10">
                      {o.order_status}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className={`inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset ${o.payment_status === 'Unpaid' ? 'bg-red-50 text-red-700 ring-red-600/10' : o.payment_status === 'Fully Paid' ? 'bg-green-50 text-green-700 ring-green-600/20' : 'bg-yellow-50 text-yellow-800 ring-yellow-600/20'}`}>
                      {o.payment_status}
                    </span>
                  </TableCell>
                  <TableCell>NPR {o.total_amount}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="icon" onClick={() => navigate(`/orders/${o.id}`)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
