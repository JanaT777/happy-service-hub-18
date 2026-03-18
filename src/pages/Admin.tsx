import { useState, useMemo } from 'react';
import { useTickets } from '@/context/TicketContext';
import {
  TicketStatus, STATUS_LABELS, REQUEST_TYPE_LABELS, STATUS_FLOW,
  ISSUE_TYPE_LABELS, SEVERITY_LABELS, REFUND_METHOD_LABELS,
  SUGGESTED_SOLUTION_LABELS, COMPLAINT_STATUS_LABELS, COMPLAINT_STATUS_FLOW,
  RequestType, Ticket, ComplaintStatus,
} from '@/types/ticket';
import { StatusBadge } from '@/components/StatusBadge';
import { Search, ChevronDown, Clock, Mail, Package, Hash, AlertTriangle, Banknote, Filter, X, CalendarIcon, RefreshCw, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { formatDistanceToNow, isAfter, isBefore, startOfDay, endOfDay, subDays } from 'date-fns';
import { sk } from 'date-fns/locale';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';

type Section = 'all' | 'new' | 'in_review' | 'returns_approval' | 'complaints_review' | 'refunds';

const SECTION_CONFIG: { key: Section; label: string; filter: (t: Ticket) => boolean }[] = [
  { key: 'all', label: 'Všetky tikety', filter: () => true },
  { key: 'new', label: 'Nové tikety', filter: t => t.status === 'new' },
  { key: 'in_review', label: 'V preskúmaní', filter: t => t.status === 'in_review' },
  { key: 'returns_approval', label: 'Vrátenia na schválenie', filter: t => t.requestType === 'return' && (t.status === 'in_review' || t.status === 'approved') },
  { key: 'complaints_review', label: 'Reklamácie na posúdenie', filter: t => t.requestType === 'complaint' && (t.status === 'new' || t.status === 'in_review') },
  { key: 'refunds', label: 'Vrátenia peňazí', filter: t => t.status === 'refund_processing' },
];

const ALL_STATUSES: TicketStatus[] = ['new', 'in_review', 'approved', 'rejected', 'refund_processing', 'completed'];
const ALL_REQUEST_TYPES: RequestType[] = ['return', 'complaint', 'other'];

const DATE_PRESETS = [
  { label: 'Dnes', days: 0 },
  { label: 'Posledných 7 dní', days: 7 },
  { label: 'Posledných 30 dní', days: 30 },
];

const COMPLAINT_STATUS_COLORS: Record<ComplaintStatus, string> = {
  complaint_new: 'bg-info/15 text-info border-info/30',
  complaint_in_progress: 'bg-warning/15 text-warning border-warning/30',
  complaint_approved: 'bg-success/15 text-success border-success/30',
  complaint_rejected: 'bg-destructive/15 text-destructive border-destructive/30',
  complaint_resolved: 'bg-muted text-muted-foreground border-muted',
};

const Admin = () => {
  const { tickets, updateTicketStatus, updateComplaintStatus } = useTickets();
  const [activeSection, setActiveSection] = useState<Section>('all');
  const [statusFilter, setStatusFilter] = useState<TicketStatus | 'all'>('all');
  const [typeFilter, setTypeFilter] = useState<RequestType | 'all'>('all');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);

  const filtered = useMemo(() => {
    const sectionFilter = SECTION_CONFIG.find(s => s.key === activeSection)!.filter;
    return tickets.filter(t => {
      if (!sectionFilter(t)) return false;
      if (statusFilter !== 'all' && t.status !== statusFilter) return false;
      if (typeFilter !== 'all' && t.requestType !== typeFilter) return false;
      if (dateFrom && isBefore(new Date(t.createdAt), startOfDay(dateFrom))) return false;
      if (dateTo && isAfter(new Date(t.createdAt), endOfDay(dateTo))) return false;
      if (search) {
        const q = search.toLowerCase();
        return t.id.toLowerCase().includes(q) || t.customerEmail.toLowerCase().includes(q) || t.orderNumber.toLowerCase().includes(q) || t.product.toLowerCase().includes(q);
      }
      return true;
    });
  }, [tickets, activeSection, statusFilter, typeFilter, dateFrom, dateTo, search]);

  const handleStatusChange = (id: string, newStatus: TicketStatus) => {
    updateTicketStatus(id, newStatus);
    toast.success(`Tiket aktualizovaný na ${STATUS_LABELS[newStatus]}`);
  };

  const handleComplaintStatusChange = (id: string, newStatus: ComplaintStatus) => {
    updateComplaintStatus(id, newStatus);
    toast.success(`Stav reklamácie aktualizovaný na "${COMPLAINT_STATUS_LABELS[newStatus]}"`);
  };

  const sectionCounts = useMemo(() =>
    SECTION_CONFIG.reduce((acc, s) => {
      acc[s.key] = tickets.filter(s.filter).length;
      return acc;
    }, {} as Record<Section, number>),
    [tickets]
  );

  const clearFilters = () => {
    setStatusFilter('all');
    setTypeFilter('all');
    setDateFrom(undefined);
    setDateTo(undefined);
    setSearch('');
  };

  const hasActiveFilters = statusFilter !== 'all' || typeFilter !== 'all' || !!dateFrom || !!dateTo || !!search;

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="mb-6">
        <h1 className="font-heading text-2xl font-bold sm:text-3xl">Prehľad podpory</h1>
        <p className="text-muted-foreground">Spravujte a riešte požiadavky zákazníkov</p>
      </div>

      {/* Súhrnné karty */}
      <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {SECTION_CONFIG.filter(s => s.key !== 'all').map(s => (
          <button key={s.key} onClick={() => setActiveSection(prev => prev === s.key ? 'all' : s.key)}
            className={`rounded-xl border p-3 text-center transition-all ${activeSection === s.key ? 'border-primary bg-accent shadow-sm' : 'bg-card hover:bg-secondary'}`}>
            <div className="text-xl font-bold font-heading">{sectionCounts[s.key]}</div>
            <div className="text-[11px] leading-tight text-muted-foreground">{s.label}</div>
          </button>
        ))}
      </div>

      {/* Vyhľadávanie + prepínač filtrov */}
      <div className="mb-4 flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input type="text" placeholder="Hľadať podľa ID tiketu, emailu, objednávky alebo produktu..."
            value={search} onChange={e => setSearch(e.target.value)}
            className="w-full rounded-lg border bg-card py-2.5 pl-10 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <Button variant={showFilters ? 'default' : 'outline'} size="sm" className="gap-1.5"
          onClick={() => setShowFilters(!showFilters)}>
          <Filter className="h-4 w-4" />
          <span className="hidden sm:inline">Filtre</span>
          {hasActiveFilters && <span className="flex h-4 w-4 items-center justify-center rounded-full bg-destructive text-[10px] text-destructive-foreground">!</span>}
        </Button>
      </div>

      {/* Panel filtrov */}
      {showFilters && (
        <div className="mb-6 rounded-xl border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <span className="text-sm font-semibold font-heading">Filtre</span>
            {hasActiveFilters && (
              <button onClick={clearFilters} className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
                <X className="h-3 w-3" /> Vymazať všetko
              </button>
            )}
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {/* Filter podľa stavu */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Stav</label>
              <div className="flex flex-wrap gap-1.5">
                {ALL_STATUSES.map(s => (
                  <button key={s} onClick={() => setStatusFilter(f => f === s ? 'all' : s)}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${statusFilter === s ? 'border-primary bg-accent text-accent-foreground' : 'bg-secondary text-secondary-foreground hover:bg-muted'}`}>
                    {STATUS_LABELS[s]}
                  </button>
                ))}
              </div>
            </div>
            {/* Filter podľa typu požiadavky */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Typ požiadavky</label>
              <div className="flex flex-wrap gap-1.5">
                {ALL_REQUEST_TYPES.map(rt => (
                  <button key={rt} onClick={() => setTypeFilter(f => f === rt ? 'all' : rt)}
                    className={`rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors ${typeFilter === rt ? 'border-primary bg-accent text-accent-foreground' : 'bg-secondary text-secondary-foreground hover:bg-muted'}`}>
                    {REQUEST_TYPE_LABELS[rt]}
                  </button>
                ))}
              </div>
            </div>
            {/* Filter podľa dátumu */}
            <div>
              <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Obdobie</label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {DATE_PRESETS.map(p => (
                  <button key={p.label} onClick={() => { setDateFrom(subDays(new Date(), p.days)); setDateTo(new Date()); }}
                    className="rounded-full border bg-secondary px-2.5 py-1 text-[11px] font-medium text-secondary-foreground hover:bg-muted transition-colors">
                    {p.label}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs flex-1">
                      <CalendarIcon className="h-3.5 w-3.5" />
                      {dateFrom ? format(dateFrom, 'd. MMM', { locale: sk }) : 'Od'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dateFrom} onSelect={setDateFrom} initialFocus />
                  </PopoverContent>
                </Popover>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-8 gap-1.5 text-xs flex-1">
                      <CalendarIcon className="h-3.5 w-3.5" />
                      {dateTo ? format(dateTo, 'd. MMM', { locale: sk }) : 'Do'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={dateTo} onSelect={setDateTo} initialFocus />
                  </PopoverContent>
                </Popover>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Záložky sekcií */}
      <Tabs value={activeSection} onValueChange={v => setActiveSection(v as Section)} className="mb-4">
        <TabsList className="w-full flex-wrap h-auto gap-1 bg-transparent p-0">
          {SECTION_CONFIG.map(s => (
            <TabsTrigger key={s.key} value={s.key} className="rounded-lg border bg-card data-[state=active]:bg-primary data-[state=active]:text-primary-foreground text-xs px-3 py-1.5">
              {s.label} ({sectionCounts[s.key]})
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      {/* Zoznam tiketov */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <div className="rounded-xl border bg-card py-16 text-center text-muted-foreground">Žiadne tikety neboli nájdené.</div>
        )}
        {filtered.map(ticket => {
          const isExpanded = expandedId === ticket.id;
          const nextStatuses = STATUS_FLOW[ticket.status];
          const isComplaint = ticket.requestType === 'complaint';
          const complaintNextStatuses = isComplaint && ticket.complaintStatus ? COMPLAINT_STATUS_FLOW[ticket.complaintStatus] : [];
          return (
            <div key={ticket.id} className="overflow-hidden rounded-xl border bg-card shadow-sm transition-shadow hover:shadow-md">
              <button onClick={() => setExpandedId(isExpanded ? null : ticket.id)}
                className="flex w-full items-center gap-4 p-4 text-left">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-heading text-sm font-bold">{ticket.id}</span>
                    <StatusBadge status={ticket.status} />
                    <span className="rounded-full bg-secondary px-2 py-0.5 text-[11px] font-medium text-secondary-foreground">
                      {REQUEST_TYPE_LABELS[ticket.requestType]}
                    </span>
                    {isComplaint && ticket.complaintStatus && (
                      <span className={`rounded-full border px-2 py-0.5 text-[11px] font-medium ${COMPLAINT_STATUS_COLORS[ticket.complaintStatus]}`}>
                        {COMPLAINT_STATUS_LABELS[ticket.complaintStatus]}
                      </span>
                    )}
                  </div>
                  <p className="mt-1 truncate text-sm text-muted-foreground">{ticket.product} — {ticket.description}</p>
                </div>
                <div className="hidden items-center gap-1 text-xs text-muted-foreground sm:flex">
                  <Clock className="h-3.5 w-3.5" />
                  {formatDistanceToNow(new Date(ticket.createdAt), { addSuffix: true, locale: sk })}
                </div>
                <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              </button>

              {isExpanded && (
                <div className="border-t bg-secondary/30 p-4">
                  <div className="grid gap-3 text-sm sm:grid-cols-2 lg:grid-cols-3">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Mail className="h-4 w-4" /> {ticket.customerEmail}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Hash className="h-4 w-4" /> {ticket.orderNumber}
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <Package className="h-4 w-4" /> {ticket.product}
                    </div>
                    {ticket.issueType && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <AlertTriangle className="h-4 w-4" />
                        <span><span className="text-xs text-muted-foreground/70">Typ reklamácie:</span> {ISSUE_TYPE_LABELS[ticket.issueType]}</span>
                      </div>
                    )}
                    {ticket.suggestedSolution && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <RefreshCw className="h-4 w-4" />
                        <span><span className="text-xs text-muted-foreground/70">Navrhované riešenie:</span> {SUGGESTED_SOLUTION_LABELS[ticket.suggestedSolution]}</span>
                      </div>
                    )}
                    {ticket.severity && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <span className={`inline-block h-2.5 w-2.5 rounded-full ${
                          ticket.severity === 'critical' ? 'bg-destructive' :
                          ticket.severity === 'high' ? 'bg-warning' :
                          ticket.severity === 'medium' ? 'bg-info' : 'bg-success'
                        }`} />
                        Závažnosť: {SEVERITY_LABELS[ticket.severity]}
                      </div>
                    )}
                    {ticket.refundMethod && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Banknote className="h-4 w-4" /> {REFUND_METHOD_LABELS[ticket.refundMethod]}
                      </div>
                    )}
                  </div>
                  <p className="mt-3 text-sm">{ticket.description}</p>

                  {ticket.attachments.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2">
                      {ticket.attachments.map((src, i) => (
                        <img key={i} src={src} alt="" className="h-16 w-16 rounded-lg border object-cover" />
                      ))}
                    </div>
                  )}

                  {/* Complaint status actions */}
                  {isComplaint && complaintNextStatuses.length > 0 && (
                    <div className="mt-4 flex flex-wrap items-center gap-2 rounded-lg border bg-card p-3">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="mr-1 text-xs font-medium text-muted-foreground">Stav reklamácie:</span>
                      {complaintNextStatuses.map(ns => (
                        <button key={ns} onClick={() => handleComplaintStatusChange(ticket.id, ns)}
                          className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                            ns === 'complaint_approved' || ns === 'complaint_resolved' ? 'bg-success text-success-foreground hover:bg-success/90' :
                            ns === 'complaint_rejected' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' :
                            'bg-warning text-warning-foreground hover:bg-warning/90'
                          }`}>
                          {COMPLAINT_STATUS_LABELS[ns]}
                        </button>
                      ))}
                    </div>
                  )}

                  {nextStatuses.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-2 border-t pt-4">
                      <span className="mr-1 self-center text-xs text-muted-foreground">Akcie:</span>
                      {nextStatuses.map(ns => (
                        <button key={ns} onClick={() => handleStatusChange(ticket.id, ns)}
                          className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
                            ns === 'approved' || ns === 'completed' ? 'bg-success text-success-foreground hover:bg-success/90' :
                            ns === 'rejected' ? 'bg-destructive text-destructive-foreground hover:bg-destructive/90' :
                            ns === 'refund_processing' ? 'bg-primary text-primary-foreground hover:bg-primary/90' :
                            'bg-warning text-warning-foreground hover:bg-warning/90'
                          }`}>
                          {STATUS_LABELS[ns]}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default Admin;
