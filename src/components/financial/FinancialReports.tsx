import { useMemo } from 'react';
import { format, parseISO, startOfMonth, endOfMonth, subMonths, isAfter, isBefore, isSameMonth, differenceInDays, startOfWeek, endOfWeek, eachDayOfInterval, getDay } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  TrendingUp, TrendingDown, Target, Wallet, CreditCard, 
  Calendar, BarChart3, PieChart, ArrowUpRight, ArrowDownRight,
  AlertTriangle, CheckCircle, Clock, Percent, DollarSign
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  BarChart, Bar, PieChart as RechartsPieChart, Pie, Cell, 
  AreaChart, Area, ComposedChart, Legend, RadialBarChart, RadialBar
} from 'recharts';

interface CashFlowEntry {
  id: string;
  type: 'income' | 'expense';
  description: string;
  amount: number;
  date: string;
  category: string | null;
  payment_method: string | null;
}

interface AccountPayable {
  id: string;
  description: string;
  supplier: string | null;
  amount: number;
  due_date: string;
  paid_date: string | null;
  status: string;
  payment_method: string | null;
  category: string | null;
}

interface AccountReceivable {
  id: string;
  description: string;
  customer: string | null;
  amount: number;
  due_date: string;
  received_date: string | null;
  status: string;
  payment_method: string | null;
  category: string | null;
}

interface FinancialReportsProps {
  cashFlow: CashFlowEntry[];
  payables: AccountPayable[];
  receivables: AccountReceivable[];
}

const CHART_COLORS = [
  'hsl(205, 90%, 45%)', 
  'hsl(142, 71%, 45%)', 
  'hsl(38, 92%, 50%)', 
  'hsl(0, 72%, 50%)', 
  'hsl(280, 60%, 50%)', 
  'hsl(180, 60%, 45%)',
  'hsl(320, 70%, 50%)',
  'hsl(60, 70%, 45%)'
];

const formatCurrency = (value: number) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(value);
};

const formatCompact = (value: number) => {
  if (value >= 1000000) return `R$${(value / 1000000).toFixed(1)}M`;
  if (value >= 1000) return `R$${(value / 1000).toFixed(0)}k`;
  return `R$${value.toFixed(0)}`;
};

export function FinancialReports({ cashFlow, payables, receivables }: FinancialReportsProps) {
  // Calculate KPIs and metrics
  const metrics = useMemo(() => {
    const now = new Date();
    const currentMonthStart = startOfMonth(now);
    const currentMonthEnd = endOfMonth(now);
    const lastMonthStart = startOfMonth(subMonths(now, 1));
    const lastMonthEnd = endOfMonth(subMonths(now, 1));

    // Current month data
    const currentMonthFlow = cashFlow.filter(c => {
      const date = parseISO(c.date);
      return isSameMonth(date, now);
    });
    const currentIncome = currentMonthFlow.filter(c => c.type === 'income').reduce((a, c) => a + c.amount, 0);
    const currentExpense = currentMonthFlow.filter(c => c.type === 'expense').reduce((a, c) => a + c.amount, 0);

    // Last month data
    const lastMonthFlow = cashFlow.filter(c => {
      const date = parseISO(c.date);
      return isSameMonth(date, subMonths(now, 1));
    });
    const lastIncome = lastMonthFlow.filter(c => c.type === 'income').reduce((a, c) => a + c.amount, 0);
    const lastExpense = lastMonthFlow.filter(c => c.type === 'expense').reduce((a, c) => a + c.amount, 0);

    // Growth rates
    const incomeGrowth = lastIncome > 0 ? ((currentIncome - lastIncome) / lastIncome) * 100 : 0;
    const expenseGrowth = lastExpense > 0 ? ((currentExpense - lastExpense) / lastExpense) * 100 : 0;

    // Profit margin
    const profitMargin = currentIncome > 0 ? ((currentIncome - currentExpense) / currentIncome) * 100 : 0;

    // Accounts aging
    const today = new Date();
    const overdueDays = payables
      .filter(p => p.status === 'overdue')
      .map(p => differenceInDays(today, parseISO(p.due_date)));
    const avgOverdueDays = overdueDays.length > 0 ? overdueDays.reduce((a, b) => a + b, 0) / overdueDays.length : 0;

    // Payment methods breakdown
    const paymentMethods = currentMonthFlow.reduce((acc, c) => {
      const method = c.payment_method || 'Outros';
      if (!acc[method]) acc[method] = { income: 0, expense: 0 };
      if (c.type === 'income') acc[method].income += c.amount;
      else acc[method].expense += c.amount;
      return acc;
    }, {} as Record<string, { income: number; expense: number }>);

    // Weekly breakdown
    const thisWeekStart = startOfWeek(now, { locale: ptBR });
    const thisWeekEnd = endOfWeek(now, { locale: ptBR });
    const weekDays = eachDayOfInterval({ start: thisWeekStart, end: thisWeekEnd });
    const weeklyData = weekDays.map(day => {
      const dayStr = format(day, 'yyyy-MM-dd');
      const dayFlow = cashFlow.filter(c => c.date === dayStr);
      return {
        day: format(day, 'EEE', { locale: ptBR }),
        income: dayFlow.filter(c => c.type === 'income').reduce((a, c) => a + c.amount, 0),
        expense: dayFlow.filter(c => c.type === 'expense').reduce((a, c) => a + c.amount, 0),
      };
    });

    // Pending amounts
    const pendingPayables = payables.filter(p => p.status === 'pending' || p.status === 'overdue');
    const pendingReceivables = receivables.filter(r => r.status === 'pending' || r.status === 'overdue');
    const totalPendingPayable = pendingPayables.reduce((a, p) => a + p.amount, 0);
    const totalPendingReceivable = pendingReceivables.reduce((a, r) => a + r.amount, 0);

    // Top suppliers by spending
    const supplierSpending = payables
      .filter(p => p.status === 'paid')
      .reduce((acc, p) => {
        const supplier = p.supplier || 'Não identificado';
        acc[supplier] = (acc[supplier] || 0) + p.amount;
        return acc;
      }, {} as Record<string, number>);
    const topSuppliers = Object.entries(supplierSpending)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Top customers by revenue
    const customerRevenue = receivables
      .filter(r => r.status === 'received')
      .reduce((acc, r) => {
        const customer = r.customer || 'Não identificado';
        acc[customer] = (acc[customer] || 0) + r.amount;
        return acc;
      }, {} as Record<string, number>);
    const topCustomers = Object.entries(customerRevenue)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    // Revenue by category
    const incomeByCategory = currentMonthFlow
      .filter(c => c.type === 'income')
      .reduce((acc, c) => {
        const cat = c.category || 'Outros';
        acc[cat] = (acc[cat] || 0) + c.amount;
        return acc;
      }, {} as Record<string, number>);

    // Expense by category
    const expenseByCategory = currentMonthFlow
      .filter(c => c.type === 'expense')
      .reduce((acc, c) => {
        const cat = c.category || 'Outros';
        acc[cat] = (acc[cat] || 0) + c.amount;
        return acc;
      }, {} as Record<string, number>);

    // Monthly trend (12 months)
    const last12Months = Array.from({ length: 12 }, (_, i) => {
      const date = subMonths(now, 11 - i);
      return {
        month: format(date, 'MMM/yy', { locale: ptBR }),
        date
      };
    });

    const monthlyTrend = last12Months.map(({ month, date }) => {
      const monthEntries = cashFlow.filter(c => isSameMonth(parseISO(c.date), date));
      const income = monthEntries.filter(c => c.type === 'income').reduce((a, c) => a + c.amount, 0);
      const expense = monthEntries.filter(c => c.type === 'expense').reduce((a, c) => a + c.amount, 0);
      return { month, income, expense, result: income - expense };
    });

    // Cash flow forecast (next 30 days)
    const next30Days = Array.from({ length: 30 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() + i);
      return format(date, 'yyyy-MM-dd');
    });

    let runningBalance = currentIncome - currentExpense;
    const forecastData = next30Days.map(dateStr => {
      const duePayables = payables.filter(p => p.due_date === dateStr && p.status === 'pending');
      const dueReceivables = receivables.filter(r => r.due_date === dateStr && r.status === 'pending');
      const expectedIncome = dueReceivables.reduce((a, r) => a + r.amount, 0);
      const expectedExpense = duePayables.reduce((a, p) => a + p.amount, 0);
      runningBalance = runningBalance + expectedIncome - expectedExpense;
      return {
        date: dateStr,
        label: format(parseISO(dateStr), 'dd/MM'),
        income: expectedIncome,
        expense: expectedExpense,
        balance: runningBalance
      };
    });

    // Bills aging analysis
    const agingBuckets = {
      current: { count: 0, amount: 0 },
      '1-30': { count: 0, amount: 0 },
      '31-60': { count: 0, amount: 0 },
      '60+': { count: 0, amount: 0 }
    };

    pendingPayables.forEach(p => {
      const daysUntilDue = differenceInDays(parseISO(p.due_date), today);
      if (daysUntilDue >= 0) {
        agingBuckets.current.count++;
        agingBuckets.current.amount += p.amount;
      } else if (daysUntilDue >= -30) {
        agingBuckets['1-30'].count++;
        agingBuckets['1-30'].amount += p.amount;
      } else if (daysUntilDue >= -60) {
        agingBuckets['31-60'].count++;
        agingBuckets['31-60'].amount += p.amount;
      } else {
        agingBuckets['60+'].count++;
        agingBuckets['60+'].amount += p.amount;
      }
    });

    return {
      currentIncome,
      currentExpense,
      lastIncome,
      lastExpense,
      incomeGrowth,
      expenseGrowth,
      profitMargin,
      avgOverdueDays,
      paymentMethods,
      weeklyData,
      totalPendingPayable,
      totalPendingReceivable,
      topSuppliers,
      topCustomers,
      incomeByCategory,
      expenseByCategory,
      monthlyTrend,
      forecastData,
      agingBuckets,
      pendingPayablesCount: pendingPayables.length,
      pendingReceivablesCount: pendingReceivables.length,
      overduePayablesCount: payables.filter(p => p.status === 'overdue').length,
      overdueReceivablesCount: receivables.filter(r => r.status === 'overdue').length,
    };
  }, [cashFlow, payables, receivables]);

  const paymentMethodsData = Object.entries(metrics.paymentMethods).map(([name, data]) => ({
    name,
    income: data.income,
    expense: data.expense,
    total: data.income + data.expense
  })).sort((a, b) => b.total - a.total);

  const incomePieData = Object.entries(metrics.incomeByCategory)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const expensePieData = Object.entries(metrics.expenseByCategory)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value)
    .slice(0, 6);

  const agingData = [
    { name: 'A vencer', value: metrics.agingBuckets.current.amount, count: metrics.agingBuckets.current.count, fill: 'hsl(var(--success))' },
    { name: '1-30 dias', value: metrics.agingBuckets['1-30'].amount, count: metrics.agingBuckets['1-30'].count, fill: 'hsl(var(--warning))' },
    { name: '31-60 dias', value: metrics.agingBuckets['31-60'].amount, count: metrics.agingBuckets['31-60'].count, fill: 'hsl(205, 90%, 45%)' },
    { name: '60+ dias', value: metrics.agingBuckets['60+'].amount, count: metrics.agingBuckets['60+'].count, fill: 'hsl(var(--destructive))' },
  ].filter(d => d.value > 0);

  return (
    <div className="space-y-6">
      {/* KPIs Row */}
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-success/10">
                <TrendingUp className="w-4 h-4 text-success" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">Crescimento Receita</span>
            </div>
            <p className={`text-xl font-bold ${metrics.incomeGrowth >= 0 ? 'text-success' : 'text-destructive'}`}>
              {metrics.incomeGrowth >= 0 ? '+' : ''}{metrics.incomeGrowth.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">vs. mês anterior</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <Percent className="w-4 h-4 text-primary" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">Margem de Lucro</span>
            </div>
            <p className={`text-xl font-bold ${metrics.profitMargin >= 0 ? 'text-success' : 'text-destructive'}`}>
              {metrics.profitMargin.toFixed(1)}%
            </p>
            <p className="text-xs text-muted-foreground mt-1">do faturamento</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-warning/10">
                <Clock className="w-4 h-4 text-warning" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">Atraso Médio</span>
            </div>
            <p className="text-xl font-bold text-foreground">
              {metrics.avgOverdueDays.toFixed(0)} dias
            </p>
            <p className="text-xs text-muted-foreground mt-1">contas vencidas</p>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="p-2 rounded-lg bg-destructive/10">
                <AlertTriangle className="w-4 h-4 text-destructive" />
              </div>
              <span className="text-xs font-medium text-muted-foreground">Inadimplência</span>
            </div>
            <p className="text-xl font-bold text-foreground">
              {metrics.overduePayablesCount + metrics.overdueReceivablesCount}
            </p>
            <p className="text-xs text-muted-foreground mt-1">contas vencidas</p>
          </CardContent>
        </Card>
      </div>

      {/* Main Charts Row */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* 12 Month Trend */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-primary" />
              Evolução Anual (12 meses)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <ComposedChart data={metrics.monthlyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="month" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" tickFormatter={formatCompact} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                    formatter={(value: number, name: string) => [formatCurrency(value), name === 'income' ? 'Receita' : name === 'expense' ? 'Despesa' : 'Resultado']}
                  />
                  <Legend formatter={(value) => value === 'income' ? 'Receita' : value === 'expense' ? 'Despesa' : 'Resultado'} />
                  <Bar dataKey="income" fill="hsl(var(--success))" name="income" />
                  <Bar dataKey="expense" fill="hsl(var(--destructive))" name="expense" />
                  <Line type="monotone" dataKey="result" stroke="hsl(var(--primary))" strokeWidth={2} dot={false} name="result" />
                </ComposedChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Cash Flow Forecast */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Target className="w-4 h-4 text-warning" />
              Projeção de Caixa (30 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[220px]">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={metrics.forecastData.filter((_, i) => i % 3 === 0)}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="label" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" tickFormatter={formatCompact} />
                  <Tooltip
                    contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }}
                    formatter={(value: number) => formatCurrency(value)}
                  />
                  <Area type="monotone" dataKey="balance" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} name="Saldo Projetado" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Second Row - Categories and Payment Methods */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Income by Category */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4 text-success" />
              Receitas por Categoria
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <RechartsPieChart>
                  <Pie data={incomePieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={30} outerRadius={55} paddingAngle={2}>
                    {incomePieData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={CHART_COLORS[index % CHART_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} formatter={(value: number) => formatCurrency(value)} />
                </RechartsPieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex flex-wrap gap-1 justify-center mt-2">
              {incomePieData.slice(0, 4).map((item, index) => (
                <div key={item.name} className="flex items-center gap-1 text-xs">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: CHART_COLORS[index % CHART_COLORS.length] }} />
                  <span className="text-muted-foreground truncate max-w-[50px]">{item.name}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-primary" />
              Formas de Pagamento
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={paymentMethodsData.slice(0, 5)} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis type="number" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" tickFormatter={formatCompact} />
                  <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" width={60} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} formatter={(value: number) => formatCurrency(value)} />
                  <Bar dataKey="income" fill="hsl(var(--success))" name="Entrada" stackId="a" />
                  <Bar dataKey="expense" fill="hsl(var(--destructive))" name="Saída" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Weekly Performance */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Calendar className="w-4 h-4 text-warning" />
              Desempenho Semanal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[180px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={metrics.weeklyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis dataKey="day" tick={{ fontSize: 10 }} stroke="hsl(var(--muted-foreground))" />
                  <YAxis tick={{ fontSize: 9 }} stroke="hsl(var(--muted-foreground))" tickFormatter={formatCompact} />
                  <Tooltip contentStyle={{ backgroundColor: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: '8px' }} formatter={(value: number, name: string) => [formatCurrency(value), name === 'income' ? 'Entrada' : 'Saída']} />
                  <Bar dataKey="income" fill="hsl(var(--success))" name="income" />
                  <Bar dataKey="expense" fill="hsl(var(--destructive))" name="expense" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Third Row - Aging, Suppliers, Customers */}
      <div className="grid gap-4 lg:grid-cols-3">
        {/* Aging Analysis */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <Clock className="w-4 h-4 text-destructive" />
              Análise de Vencimentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            {agingData.length > 0 ? (
              <div className="space-y-3">
                {agingData.map((item, index) => (
                  <div key={item.name} className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">{item.name}</span>
                      <span className="font-medium">{formatCurrency(item.value)}</span>
                    </div>
                    <Progress 
                      value={(item.value / Math.max(...agingData.map(d => d.value))) * 100} 
                      className="h-2"
                    />
                    <p className="text-xs text-muted-foreground">{item.count} conta(s)</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[180px] text-muted-foreground">
                <CheckCircle className="w-8 h-8 mb-2 text-success" />
                <p className="text-sm">Nenhuma conta pendente</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Suppliers */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ArrowDownRight className="w-4 h-4 text-destructive" />
              Principais Fornecedores
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.topSuppliers.length > 0 ? (
              <div className="space-y-2">
                {metrics.topSuppliers.map(([name, value], index) => (
                  <div key={name} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="w-5 h-5 flex items-center justify-center text-xs p-0">
                        {index + 1}
                      </Badge>
                      <span className="text-sm truncate max-w-[120px]">{name}</span>
                    </div>
                    <span className="text-sm font-semibold text-destructive">{formatCurrency(value)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[180px] text-muted-foreground">
                <Wallet className="w-8 h-8 mb-2" />
                <p className="text-sm">Sem dados de fornecedores</p>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Top Customers */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-semibold flex items-center gap-2">
              <ArrowUpRight className="w-4 h-4 text-success" />
              Principais Clientes
            </CardTitle>
          </CardHeader>
          <CardContent>
            {metrics.topCustomers.length > 0 ? (
              <div className="space-y-2">
                {metrics.topCustomers.map(([name, value], index) => (
                  <div key={name} className="flex items-center justify-between p-2 bg-muted/30 rounded-lg">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="w-5 h-5 flex items-center justify-center text-xs p-0">
                        {index + 1}
                      </Badge>
                      <span className="text-sm truncate max-w-[120px]">{name}</span>
                    </div>
                    <span className="text-sm font-semibold text-success">{formatCurrency(value)}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[180px] text-muted-foreground">
                <DollarSign className="w-8 h-8 mb-2" />
                <p className="text-sm">Sem dados de clientes</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Financial Health Summary */}
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-sm font-semibold flex items-center gap-2">
            <Target className="w-4 h-4 text-primary" />
            Resumo da Saúde Financeira
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="p-4 bg-success/5 rounded-lg border border-success/20">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle className="w-4 h-4 text-success" />
                <span className="text-sm font-medium">Receita do Mês</span>
              </div>
              <p className="text-2xl font-bold text-success">{formatCurrency(metrics.currentIncome)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics.incomeGrowth >= 0 ? '+' : ''}{metrics.incomeGrowth.toFixed(1)}% vs. anterior
              </p>
            </div>

            <div className="p-4 bg-destructive/5 rounded-lg border border-destructive/20">
              <div className="flex items-center gap-2 mb-2">
                <TrendingDown className="w-4 h-4 text-destructive" />
                <span className="text-sm font-medium">Despesa do Mês</span>
              </div>
              <p className="text-2xl font-bold text-destructive">{formatCurrency(metrics.currentExpense)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics.expenseGrowth >= 0 ? '+' : ''}{metrics.expenseGrowth.toFixed(1)}% vs. anterior
              </p>
            </div>

            <div className="p-4 bg-warning/5 rounded-lg border border-warning/20">
              <div className="flex items-center gap-2 mb-2">
                <Clock className="w-4 h-4 text-warning" />
                <span className="text-sm font-medium">A Pagar</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(metrics.totalPendingPayable)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics.pendingPayablesCount} conta(s) pendente(s)
              </p>
            </div>

            <div className="p-4 bg-primary/5 rounded-lg border border-primary/20">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="w-4 h-4 text-primary" />
                <span className="text-sm font-medium">A Receber</span>
              </div>
              <p className="text-2xl font-bold text-foreground">{formatCurrency(metrics.totalPendingReceivable)}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {metrics.pendingReceivablesCount} conta(s) pendente(s)
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
