import React, { useState, useMemo, useEffect } from 'react';
import { Search, MapPin, Download, Loader2, Globe, Phone, Star, ExternalLink, AlertCircle, CheckCircle2, XCircle, MoreHorizontal, Copy, PhoneCall, Share2, ArrowUpDown, ChevronDown, Mail, MessageCircle, X, Settings, Filter, Shield, Zap, Sliders } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { findLeads } from './services/gemini';
import { BusinessLead } from './types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { Country, City } from 'country-state-city';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const CATEGORIES = [
  'Accounting',
  'Advertising Agency',
  'Architecture',
  'Art Gallery',
  'Auto Repair',
  'Bakery',
  'Bank',
  'Bar',
  'Barber Shop',
  'Beauty Salon',
  'Bicycle Shop',
  'Bookstore',
  'Cafe',
  'Car Dealer',
  'Car Rental',
  'Catering',
  'Cleaning Service',
  'Clothing Store',
  'Coffee Shop',
  'Construction',
  'Consulting',
  'Co-working Space',
  'Day Care',
  'Dentist',
  'Digital Marketing',
  'Dry Cleaning',
  'Electrician',
  'Electronics Store',
  'Event Planning',
  'Financial Advisor',
  'Fitness Center',
  'Florist',
  'Furniture Store',
  'Gas Station',
  'Graphic Design',
  'Grocery Store',
  'Gym',
  'Hair Salon',
  'Hardware Store',
  'Hospital',
  'Hotel',
  'Insurance Agency',
  'Interior Design',
  'IT Services',
  'Jewelry Store',
  'Landscaping',
  'Laundry',
  'Lawyer',
  'Library',
  'Locksmith',
  'Marketing Agency',
  'Massage Therapy',
  'Medical Clinic',
  'Moving Company',
  'Music School',
  'Nail Salon',
  'Night Club',
  'Optician',
  'Painting Service',
  'Pet Shop',
  'Pharmacy',
  'Photography',
  'Physiotherapy',
  'Plumber',
  'Printing Service',
  'Psychologist',
  'Real Estate',
  'Recruitment Agency',
  'Restaurant',
  'Roofing',
  'School',
  'Security Service',
  'Software Company',
  'Solar Energy',
  'Spa',
  'Sports Club',
  'Supermarket',
  'Tailor',
  'Tattoo Studio',
  'Taxi Service',
  'Travel Agency',
  'Tutoring',
  'Veterinary Clinic',
  'Web Design',
  'Wedding Planning',
  'Yoga Studio',
];

type SortOption = 'rating' | 'reviews' | 'name' | 'none';

const WhatsAppIcon = ({ size = 16, className = "" }: { size?: number; className?: string }) => (
  <svg 
    width={size} 
    height={size} 
    viewBox="0 0 24 24" 
    fill="currentColor" 
    className={className}
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
  </svg>
);

export default function App() {
  const [selectedCategory, setSelectedCategory] = useState('');
  const [customCategory, setCustomCategory] = useState('');
  const [selectedCountryCode, setSelectedCountryCode] = useState('');
  const [selectedCity, setSelectedCity] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [results, setResults] = useState<BusinessLead[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('none');
  const [activeMenu, setActiveMenu] = useState<number | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [settings, setSettings] = useState({
    excludeWithWebsites: false,
    minRating: 0,
    minReviews: 0,
    resultsLimit: 20,
  });

  const countries = useMemo(() => Country.getAllCountries(), []);
  const cities = useMemo(() => {
    if (!selectedCountryCode) return [];
    return City.getCitiesOfCountry(selectedCountryCode) || [];
  }, [selectedCountryCode]);

  const finalKeyword = selectedCategory === 'Custom' ? customCategory : selectedCategory;
  const countryName = countries.find(c => c.isoCode === selectedCountryCode)?.name || '';
  const finalLocation = selectedCity ? `${selectedCity}, ${countryName}` : countryName;

  useEffect(() => {
    setSelectedCity('');
  }, [selectedCountryCode]);

  const sortedResults = useMemo(() => {
    if (sortBy === 'none') return results;
    return [...results].sort((a, b) => {
      if (sortBy === 'rating') return (b.rating || 0) - (a.rating || 0);
      if (sortBy === 'reviews') return (b.reviewsCount || 0) - (a.reviewsCount || 0);
      if (sortBy === 'name') return a.name.localeCompare(b.name);
      return 0;
    });
  }, [results, sortBy]);

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!finalKeyword || !finalLocation) return;

    setIsSearching(true);
    setError(null);
    setResults([]);

    try {
      let leads = await findLeads(finalKeyword, finalLocation);
      
      // Apply Settings Filters
      if (settings.excludeWithWebsites) {
        leads = leads.filter(l => !l.hasWebsite);
      }
      if (settings.minRating > 0) {
        leads = leads.filter(l => (l.rating || 0) >= settings.minRating);
      }
      if (settings.minReviews > 0) {
        leads = leads.filter(l => (l.reviewsCount || 0) >= settings.minReviews);
      }
      
      setResults(leads.slice(0, settings.resultsLimit));
      if (leads.length === 0) {
        setError("No leads found matching your criteria. Try a different keyword or location.");
      }
    } catch (err) {
      setError("Failed to fetch leads. Please try again later.");
      console.error(err);
    } finally {
      setIsSearching(false);
    }
  };

  const handleLoadMore = async () => {
    if (!finalKeyword || !finalLocation || isLoadingMore) return;

    setIsLoadingMore(true);
    const existingNames = results.map(r => r.name);

    try {
      let moreLeads = await findLeads(finalKeyword, finalLocation, existingNames);
      
      // Apply Settings Filters
      if (settings.excludeWithWebsites) {
        moreLeads = moreLeads.filter(l => !l.hasWebsite);
      }
      if (settings.minRating > 0) {
        moreLeads = moreLeads.filter(l => (l.rating || 0) >= settings.minRating);
      }
      if (settings.minReviews > 0) {
        moreLeads = moreLeads.filter(l => (l.reviewsCount || 0) >= settings.minReviews);
      }

      if (moreLeads.length === 0) {
        // Optionally show a small toast or message
      } else {
        setResults(prev => [...prev, ...moreLeads]);
      }
    } catch (err) {
      console.error("Failed to load more leads:", err);
    } finally {
      setIsLoadingMore(false);
    }
  };

  const downloadCSV = () => {
    if (results.length === 0) return;

    const headers = ['Name', 'Category', 'Address', 'Phone', 'Email', 'WhatsApp', 'Rating', 'Reviews', 'Has Website', 'Website URL', 'Maps URL'];
    const csvRows = [
      headers.join(','),
      ...results.map(lead => [
        `"${lead.name.replace(/"/g, '""')}"`,
        `"${lead.category.replace(/"/g, '""')}"`,
        `"${lead.address.replace(/"/g, '""')}"`,
        `"${(lead.phone || '').replace(/"/g, '""')}"`,
        `"${(lead.email || '').replace(/"/g, '""')}"`,
        `"${(lead.whatsapp || '').replace(/"/g, '""')}"`,
        lead.rating || 0,
        lead.reviewsCount || 0,
        lead.hasWebsite ? 'Yes' : 'No',
        `"${(lead.websiteUrl || '').replace(/"/g, '""')}"`,
        `"${lead.mapsUrl.replace(/"/g, '""')}"`
      ].join(','))
    ];

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `leads_${finalKeyword.replace(/\s+/g, '_')}_${finalLocation.replace(/\s+/g, '_')}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    // Could add a toast here
  };

  return (
    <div className="min-h-screen bg-netflix-black text-white font-sans selection:bg-netflix-red selection:text-white" onClick={() => setActiveMenu(null)}>
      {/* Background Gradient */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-netflix-red/10 via-transparent to-transparent opacity-30" />
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-netflix-red/20 rounded-full blur-[120px] opacity-20" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-netflix-black/60 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-netflix-red rounded-lg flex items-center justify-center text-white shadow-lg shadow-netflix-red/40">
              <MapPin size={22} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter text-white leading-none font-display">LEAD<span className="text-netflix-red">GEN</span></h1>
              <p className="text-[9px] font-bold text-white/40 uppercase tracking-[0.3em] mt-1">Maps Intelligence</p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-8">
            <nav className="flex items-center gap-6 text-sm font-bold text-white/60">
              <a href="#" className="hover:text-netflix-red transition-colors uppercase tracking-widest text-[11px]">Dashboard</a>
              <a href="#" className="hover:text-netflix-red transition-colors uppercase tracking-widest text-[11px]">History</a>
              <button 
                onClick={() => setShowSettings(true)}
                className="hover:text-netflix-red transition-colors uppercase tracking-widest text-[11px] cursor-pointer"
              >
                Settings
              </button>
            </nav>
            <div className="h-4 w-px bg-white/10" />
            <div className="text-[10px] font-mono text-white/30 uppercase tracking-widest">
              v1.0.5
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-12">
        {/* Hero Section */}
        <div className="mb-16 max-w-3xl">
          <h2 className="text-5xl font-black tracking-tighter text-white mb-6 sm:text-7xl font-display leading-[0.9]">
            Find high-intent leads <span className="text-netflix-red">instantly.</span>
          </h2>
          <p className="text-xl text-white/60 leading-relaxed font-medium max-w-xl">
            Extract business data from Google Maps to power your agency's outreach. 
            Identify businesses without websites and start scaling today.
          </p>
        </div>

        {/* Search Controls */}
        <section className="glass-card p-10 mb-16 relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 glossy-gradient" />
          <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-12 gap-8">
            <div className="md:col-span-3 space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-1">Business Category</label>
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" size={18} />
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="glass-input pl-12 appearance-none cursor-pointer font-bold"
                  required
                >
                  <option value="" disabled className="bg-netflix-dark">Select Category</option>
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat} className="bg-netflix-dark">{cat}</option>
                  ))}
                  <option value="Custom" className="bg-netflix-dark">Custom...</option>
                </select>
                {selectedCategory === 'Custom' && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mt-4"
                  >
                    <input
                      type="text"
                      placeholder="Type custom category..."
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      className="glass-input font-bold"
                      autoFocus
                      required
                    />
                  </motion.div>
                )}
              </div>
            </div>

            <div className="md:col-span-3 space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-1">Country</label>
              <div className="relative">
                <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" size={18} />
                <select
                  value={selectedCountryCode}
                  onChange={(e) => setSelectedCountryCode(e.target.value)}
                  className="glass-input pl-12 appearance-none cursor-pointer font-bold"
                  required
                >
                  <option value="" disabled className="bg-netflix-dark">Select Country</option>
                  {countries.map((c) => (
                    <option key={c.isoCode} value={c.isoCode} className="bg-netflix-dark">{c.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="md:col-span-3 space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-1">City</label>
              <div className="relative">
                <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 text-white/40 pointer-events-none" size={18} />
                <select
                  value={selectedCity}
                  onChange={(e) => setSelectedCity(e.target.value)}
                  className="glass-input pl-12 appearance-none cursor-pointer font-bold disabled:opacity-30"
                  disabled={!selectedCountryCode}
                >
                  <option value="" className="bg-netflix-dark">{selectedCountryCode ? 'All Cities (Optional)' : 'Select Country First'}</option>
                  {cities.map((city, index) => (
                    <option key={`${city.name}-${city.stateCode}-${index}`} value={city.name} className="bg-netflix-dark">{city.name}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="md:col-span-3 flex items-end pb-0.5">
              <button
                type="submit"
                disabled={isSearching}
                className="btn-netflix w-full h-[52px]"
              >
                {isSearching ? (
                  <>
                    <Loader2 className="animate-spin" size={20} />
                    <span>Analyzing...</span>
                  </>
                ) : (
                  <>
                    <Search size={20} />
                    <span>Generate Leads</span>
                  </>
                )}
              </button>
            </div>
          </form>
        </section>

        {/* Results Section */}
        <div className="space-y-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <h2 className="text-3xl font-black tracking-tight text-white font-display">
                Discovery
              </h2>
              {results.length > 0 && (
                <span className="bg-netflix-red text-white text-[10px] font-black px-4 py-1.5 rounded-full uppercase tracking-[0.2em] shadow-lg shadow-netflix-red/20">
                  {results.length} Leads Found
                </span>
              )}
            </div>
            
            {results.length > 0 && (
              <div className="flex items-center gap-4">
                <div className="relative group">
                  <div className="flex items-center gap-3 bg-white/5 px-5 py-2.5 rounded-lg border border-white/10 shadow-xl text-[11px] font-black uppercase tracking-widest text-white/70 cursor-pointer hover:bg-white/10 transition-all">
                    <ArrowUpDown size={14} className="text-netflix-red" />
                    <span>Sort: {sortBy === 'none' ? 'Default' : sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}</span>
                    <ChevronDown size={14} />
                  </div>
                  <div className="absolute right-0 top-full mt-2 w-44 bg-netflix-gray border border-white/10 rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 overflow-hidden py-1">
                    {(['none', 'rating', 'reviews', 'name'] as SortOption[]).map(option => (
                      <button
                        key={option}
                        onClick={() => setSortBy(option)}
                        className={cn(
                          "w-full text-left px-5 py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-colors",
                          sortBy === option ? "bg-netflix-red text-white" : "text-white/50 hover:bg-white/5 hover:text-white"
                        )}
                      >
                        {option === 'none' ? 'Default' : option}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={downloadCSV}
                  className="flex items-center gap-3 text-[11px] font-black uppercase tracking-widest text-white/70 hover:text-white transition-all bg-white/5 px-5 py-2.5 rounded-lg border border-white/10 shadow-xl hover:bg-white/10"
                >
                  <Download size={16} className="text-netflix-red" />
                  Export CSV
                </button>
              </div>
            )}
          </div>

          <AnimatePresence mode="wait">
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="bg-rose-50 border border-rose-100 text-rose-700 p-5 rounded-2xl flex items-start gap-4"
              >
                <AlertCircle className="shrink-0 mt-0.5" size={20} />
                <div>
                  <p className="font-bold text-sm">Search Error</p>
                  <p className="text-sm opacity-90 mt-1">{error}</p>
                </div>
              </motion.div>
            )}

            {isSearching ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10"
              >
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="glass-card p-8 animate-pulse border-white/5">
                    <div className="flex justify-between mb-8">
                      <div className="h-4 bg-white/10 rounded w-20" />
                      <div className="h-4 bg-white/10 rounded w-12" />
                    </div>
                    <div className="h-10 bg-white/10 rounded w-3/4 mb-6" />
                    <div className="space-y-4 mb-10">
                      <div className="h-4 bg-white/5 rounded w-full" />
                      <div className="h-4 bg-white/5 rounded w-5/6" />
                    </div>
                    <div className="flex justify-between pt-8 border-t border-white/5">
                      <div className="h-8 bg-white/5 rounded w-24" />
                      <div className="h-8 bg-white/5 rounded w-8" />
                    </div>
                  </div>
                ))}
              </motion.div>
            ) : results.length > 0 ? (
              <div className="space-y-16">
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-10"
                >
                  {sortedResults.map((lead, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, y: 30 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: idx * 0.05, duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
                      className="group glass-card p-8 hover:bg-white/10 hover:border-white/20 transition-all duration-500 relative overflow-hidden netflix-shadow"
                    >
                      {/* Glossy Overlay */}
                      <div className="absolute top-0 left-0 w-full h-1 glossy-gradient opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      
                      <div className="relative z-10">
                        <div className="flex justify-between items-start mb-8">
                          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-netflix-red bg-netflix-red/10 px-3 py-1.5 rounded-md border border-netflix-red/20">
                            {lead.category}
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-white/5 rounded-lg border border-white/5">
                              <Star size={12} fill="#E50914" className="text-netflix-red" />
                              <span className="text-[11px] font-black text-white font-mono">{lead.rating || 'N/A'}</span>
                              <span className="text-white/30 text-[10px] font-bold">({lead.reviewsCount || 0})</span>
                            </div>
                            <div className="relative">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenu(activeMenu === idx ? null : idx);
                                }}
                                className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/40 hover:text-white"
                              >
                                <MoreHorizontal size={20} />
                              </button>
                              <AnimatePresence>
                                {activeMenu === idx && (
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                    className="absolute right-0 top-full mt-3 w-52 bg-netflix-gray border border-white/10 rounded-xl shadow-2xl z-30 overflow-hidden py-2"
                                  >
                                    <button 
                                      onClick={() => copyToClipboard(`${lead.name}\n${lead.address}\nPhone: ${lead.phone || 'N/A'}\nEmail: ${lead.email || 'N/A'}\nWhatsApp: ${lead.whatsapp || 'N/A'}`)}
                                      className="w-full px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-white/60 hover:bg-white/5 hover:text-white flex items-center gap-4 transition-colors"
                                    >
                                      <Copy size={14} className="text-netflix-red" />
                                      Copy Details
                                    </button>
                                    {lead.phone && (
                                      <a 
                                        href={`tel:${lead.phone}`}
                                        className="w-full px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-white/60 hover:bg-white/5 hover:text-white flex items-center gap-4 transition-colors"
                                      >
                                        <PhoneCall size={14} className="text-netflix-red" />
                                        Call Business
                                      </a>
                                    )}
                                    {lead.email && (
                                      <a 
                                        href={`mailto:${lead.email}`}
                                        className="w-full px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-white/60 hover:bg-white/5 hover:text-white flex items-center gap-4 transition-colors"
                                      >
                                        <Mail size={14} className="text-netflix-red" />
                                        Email Business
                                      </a>
                                    )}
                                    {lead.whatsapp && (
                                      <a 
                                        href={`https://wa.me/${lead.whatsapp.replace(/\D/g, '')}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="w-full px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-white/60 hover:bg-white/5 hover:text-white flex items-center gap-4 transition-colors"
                                      >
                                        <WhatsAppIcon size={14} className="text-emerald-500" />
                                        WhatsApp
                                      </a>
                                    )}
                                    <button 
                                      onClick={() => copyToClipboard(lead.mapsUrl)}
                                      className="w-full px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-white/60 hover:bg-white/5 hover:text-white flex items-center gap-4 transition-colors"
                                    >
                                      <Share2 size={14} className="text-netflix-red" />
                                      Share Maps Link
                                    </button>
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          </div>
                        </div>
                        
                        <h3 className="font-black text-2xl mb-4 text-white group-hover:text-netflix-red transition-colors leading-tight font-display">
                          {lead.name}
                        </h3>
                        
                        <div className="space-y-4 mb-10">
                          <div className="flex items-start gap-4 text-white/50">
                            <MapPin size={18} className="shrink-0 mt-0.5 text-netflix-red/60" />
                            <p className="text-sm leading-relaxed line-clamp-2 font-medium">{lead.address}</p>
                          </div>
                          {lead.phone && (
                            <div className="flex items-center gap-4 text-white/50">
                              <Phone size={18} className="shrink-0 text-netflix-red/60" />
                              <p className="text-sm font-mono font-bold tracking-tight">{lead.phone}</p>
                            </div>
                          )}
                          {lead.email && (
                            <a 
                              href={`mailto:${lead.email}`}
                              className="flex items-center gap-4 text-white/50 hover:text-white transition-colors group/link"
                            >
                              <Mail size={18} className="shrink-0 text-netflix-red/60 group-hover/link:text-netflix-red" />
                              <p className="text-sm font-bold truncate">{lead.email}</p>
                            </a>
                          )}
                          {lead.whatsapp && (
                            <a 
                              href={`https://wa.me/${lead.whatsapp.replace(/\D/g, '')}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-4 text-emerald-500/80 hover:text-emerald-400 transition-colors group/link"
                            >
                              <WhatsAppIcon size={18} className="shrink-0 text-emerald-500/60 group-hover/link:text-emerald-500" />
                              <p className="text-sm font-mono font-bold tracking-tight">{lead.whatsapp}</p>
                            </a>
                          )}
                        </div>

                        <div className="flex items-center justify-between pt-8 border-t border-white/5">
                          <div className="flex items-center gap-2">
                            {lead.hasWebsite ? (
                              <div className="flex items-center gap-1.5 text-white/30 bg-white/5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border border-white/5">
                                <Globe size={12} />
                                Website Found
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5 text-netflix-red bg-netflix-red/10 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border border-netflix-red/20">
                                <AlertCircle size={12} />
                                No Website
                              </div>
                            )}
                          </div>
                          <a
                            href={lead.mapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="w-10 h-10 flex items-center justify-center text-white/40 hover:text-netflix-red hover:bg-white/5 rounded-xl transition-all border border-transparent hover:border-white/10"
                            title="View on Google Maps"
                          >
                            <ExternalLink size={18} />
                          </a>
                        </div>
                      </div>
                    </motion.div>
                  ))}
                </motion.div>

                {/* Load More Button */}
                <div className="flex justify-center pt-12 pb-20">
                  <button
                    onClick={handleLoadMore}
                    disabled={isLoadingMore}
                    className="btn-ghost px-12 py-4 text-xs font-black uppercase tracking-[0.3em] min-w-[280px]"
                  >
                    {isLoadingMore ? (
                      <>
                        <Loader2 className="animate-spin" size={18} />
                        Fetching More...
                      </>
                    ) : (
                      <>
                        <ChevronDown size={18} />
                        Load More Results
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : !isSearching && !error && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-card p-24 text-center border-white/5"
              >
                <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto mb-8 border border-white/10 shadow-2xl">
                  <Search className="text-white/20" size={40} strokeWidth={1.5} />
                </div>
                <h3 className="text-3xl font-black text-white mb-4 font-display">Ready to find leads?</h3>
                <p className="text-white/40 max-w-sm mx-auto font-medium text-lg">
                  Select a category and location above to start generating high-quality business leads.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/5 py-20 bg-netflix-black relative z-10">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-12">
          <div className="flex items-center gap-4 opacity-40 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-700">
            <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center">
              <MapPin size={20} />
            </div>
            <span className="text-xl font-black tracking-tighter font-display uppercase">LEADGEN</span>
          </div>
          <div className="flex gap-10 text-[10px] font-black uppercase tracking-[0.3em] text-white/30">
            <a href="#" className="hover:text-netflix-red transition-colors">Privacy</a>
            <a href="#" className="hover:text-netflix-red transition-colors">Terms</a>
            <a href="#" className="hover:text-netflix-red transition-colors">API Docs</a>
            <a href="#" className="hover:text-netflix-red transition-colors">Support</a>
          </div>
          <p className="text-[10px] font-mono text-white/20 uppercase tracking-widest">
            © 2026 LeadGen Intelligence. All rights reserved.
          </p>
        </div>
      </footer>
      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-netflix-black/80 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-xl glass-card overflow-hidden netflix-shadow border-white/10"
            >
              <div className="absolute top-0 left-0 w-full h-1 glossy-gradient" />
              
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 bg-netflix-red/10 rounded-xl flex items-center justify-center text-netflix-red border border-netflix-red/20">
                      <Settings size={24} />
                    </div>
                    <div>
                      <h3 className="text-2xl font-black text-white font-display">Search Settings</h3>
                      <p className="text-white/40 text-xs font-bold uppercase tracking-widest mt-1">Configure your lead filters</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowSettings(false)}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors text-white/40 hover:text-white"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="space-y-8">
                  {/* Filter: No Website */}
                  <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5 hover:border-white/10 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-white/5 rounded-lg flex items-center justify-center text-white/40 group-hover:text-netflix-red transition-colors">
                        <Globe size={20} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-white">Exclude Businesses with Websites</p>
                        <p className="text-xs text-white/40 font-medium">Only show leads that need a new website</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSettings(s => ({ ...s, excludeWithWebsites: !s.excludeWithWebsites }))}
                      className={cn(
                        "w-12 h-6 rounded-full transition-all relative",
                        settings.excludeWithWebsites ? "bg-netflix-red" : "bg-white/10"
                      )}
                    >
                      <motion.div 
                        animate={{ x: settings.excludeWithWebsites ? 24 : 4 }}
                        className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-lg"
                      />
                    </button>
                  </div>

                  {/* Quality Thresholds */}
                  <div className="grid grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-1 flex items-center gap-2">
                        <Star size={12} className="text-amber-500" />
                        Min Rating
                      </label>
                      <select
                        value={settings.minRating}
                        onChange={(e) => setSettings(s => ({ ...s, minRating: Number(e.target.value) }))}
                        className="glass-input text-xs font-bold"
                      >
                        <option value={0} className="bg-netflix-dark">Any Rating</option>
                        <option value={3} className="bg-netflix-dark">3.0+ Stars</option>
                        <option value={4} className="bg-netflix-dark">4.0+ Stars</option>
                        <option value={4.5} className="bg-netflix-dark">4.5+ Stars</option>
                      </select>
                    </div>
                    <div className="space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-1 flex items-center gap-2">
                        <MessageCircle size={12} className="text-netflix-red" />
                        Min Reviews
                      </label>
                      <select
                        value={settings.minReviews}
                        onChange={(e) => setSettings(s => ({ ...s, minReviews: Number(e.target.value) }))}
                        className="glass-input text-xs font-bold"
                      >
                        <option value={0} className="bg-netflix-dark">Any Reviews</option>
                        <option value={10} className="bg-netflix-dark">10+ Reviews</option>
                        <option value={50} className="bg-netflix-dark">50+ Reviews</option>
                        <option value={100} className="bg-netflix-dark">100+ Reviews</option>
                      </select>
                    </div>
                  </div>

                  {/* Results Limit */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 ml-1 flex items-center gap-2">
                        <Zap size={12} className="text-blue-400" />
                        Leads per Search
                      </label>
                      <span className="text-xs font-mono font-bold text-netflix-red">{settings.resultsLimit} Leads</span>
                    </div>
                    <input 
                      type="range"
                      min="10"
                      max="50"
                      step="10"
                      value={settings.resultsLimit}
                      onChange={(e) => setSettings(s => ({ ...s, resultsLimit: Number(e.target.value) }))}
                      className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-netflix-red"
                    />
                    <div className="flex justify-between text-[9px] font-bold text-white/20 uppercase tracking-widest">
                      <span>Fast (10)</span>
                      <span>Deep (50)</span>
                    </div>
                  </div>
                </div>

                <div className="mt-10 pt-8 border-t border-white/5">
                  <button
                    onClick={() => setShowSettings(false)}
                    className="btn-netflix w-full"
                  >
                    Save Preferences
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
