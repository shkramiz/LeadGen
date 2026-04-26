import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, MapPin, Download, Loader2, Globe, Phone, Star, ExternalLink, AlertCircle, CheckCircle2, XCircle, MoreHorizontal, Copy, PhoneCall, Share2, ArrowUpDown, ChevronDown, Mail, MessageCircle, X, Settings, Filter, Shield, Zap, Sliders, Moon, Sun, Menu, Bookmark } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { findLeads } from './services/gemini';
import { BusinessLead, SavedSearch } from './types';
import { Country, City } from 'country-state-city';
import { cn } from './lib/utils';
import { CATEGORIES } from './constants';
import { CustomSelect } from './components/ui/CustomSelect';
import { WhatsAppIcon } from './components/icons';

type SortOption = 'rating' | 'reviews' | 'name' | 'none';

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
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [savedSearches, setSavedSearches] = useState<SavedSearch[]>(() => {
    const saved = localStorage.getItem('leadgen_saved_searches');
    return saved ? JSON.parse(saved) : [];
  });
  
  const [settings, setSettings] = useState({
    excludeWithWebsites: false,
    requireEmail: false,
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

  useEffect(() => {
    localStorage.setItem('leadgen_saved_searches', JSON.stringify(savedSearches));
  }, [savedSearches]);

  const handleSaveSearch = () => {
    if (!selectedCategory || !selectedCountryCode) return;
    
    // Check if already exists (same category, country, city)
    const exists = savedSearches.some(s => 
      s.category === selectedCategory && 
      s.customCategory === customCategory && 
      s.countryCode === selectedCountryCode && 
      s.city === selectedCity
    );
    if (exists) return;

    const newSearch: SavedSearch = {
      id: Math.random().toString(36).substring(2, 9),
      category: selectedCategory,
      customCategory,
      countryCode: selectedCountryCode,
      city: selectedCity,
      name: `${finalKeyword} in ${finalLocation}`,
      createdAt: Date.now()
    };
    
    setSavedSearches([newSearch, ...savedSearches]);
  };

  const handleLoadSearch = (search: SavedSearch) => {
    setSelectedCategory(search.category);
    setCustomCategory(search.customCategory);
    setSelectedCountryCode(search.countryCode);
    setTimeout(() => {
      setSelectedCity(search.city);
    }, 0);
  };

  const handleDeleteSearch = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSavedSearches(savedSearches.filter(s => s.id !== id));
  };

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [isDarkMode]);

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
      if (settings.requireEmail) {
        leads = leads.filter(l => !!l.email);
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
      if (settings.requireEmail) {
        moreLeads = moreLeads.filter(l => !!l.email);
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
    <div className="min-h-screen bg-[color:var(--bg-primary)] text-[color:var(--text-primary)] font-sans selection:bg-netflix-red selection:text-[#FFFFFF]" onClick={() => setActiveMenu(null)}>
      {/* Background Gradient */}
      <div className="fixed inset-0 pointer-events-none z-0">
        <div className="absolute inset-0 bg-gradient-to-b from-netflix-red/10 via-transparent to-transparent opacity-30" />
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-netflix-red/20 rounded-full blur-[120px] opacity-20" />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-50 bg-[color:var(--bg-primary)]/80 backdrop-blur-xl border-b border-[color:var(--glass-border)] transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-netflix-red rounded-lg flex items-center justify-center text-[#FFFFFF] shadow-lg shadow-netflix-red/40">
              <MapPin size={22} strokeWidth={2.5} />
            </div>
            <div>
              <h1 className="text-2xl font-black tracking-tighter text-[color:var(--text-primary)] leading-none font-display">LEAD<span className="text-netflix-red">GEN</span></h1>
              <p className="text-[9px] font-bold text-[color:var(--text-secondary)] uppercase tracking-[0.3em] mt-1">Maps Intelligence</p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-8">
            <nav className="flex items-center gap-6 text-sm font-bold text-[color:var(--text-secondary)]">
              <a href="#" className="hover:text-netflix-red transition-colors uppercase tracking-widest text-[11px]">Dashboard</a>
              <a href="#" className="hover:text-netflix-red transition-colors uppercase tracking-widest text-[11px]">History</a>
              <button 
                onClick={() => setShowSettings(true)}
                className="hover:text-netflix-red transition-colors uppercase tracking-widest text-[11px] cursor-pointer"
              >
                Settings
              </button>
            </nav>
            <div className="h-4 w-px bg-[color:var(--glass-border)]" />
            <div className="text-[10px] font-mono text-[color:var(--text-secondary)] uppercase tracking-widest">
              v1.0.5
            </div>
          </div>
          
          <button 
            className="md:hidden p-2 text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] transition-colors"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu size={24} />
          </button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <div className="md:hidden fixed inset-0 z-[100] flex justify-end">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: '100%' }}
              animate={{ x: 0 }}
              exit={{ x: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="relative w-64 h-full bg-[color:var(--bg-secondary)] border-l border-[color:var(--glass-border)] shadow-2xl flex flex-col"
            >
              <div className="absolute top-0 left-0 w-full h-1 glossy-gradient" />
              <div className="p-6 flex items-center justify-between border-b border-[color:var(--glass-border)]">
                <span className="text-lg font-black tracking-tighter text-[color:var(--text-primary)] font-display uppercase">Menu</span>
                <button 
                  onClick={() => setIsMobileMenuOpen(false)}
                  className="p-2 -mr-2 text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] transition-colors rounded-lg hover:bg-[color:var(--btn-ghost-hover)]"
                >
                  <X size={20} />
                </button>
              </div>
              <nav className="flex flex-col gap-2 p-4 flex-1">
                <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-lg text-[13px] font-bold text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:bg-[color:var(--glass-bg)] transition-colors uppercase tracking-widest">
                  Dashboard
                </a>
                <a href="#" className="flex items-center gap-3 px-4 py-3 rounded-lg text-[13px] font-bold text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:bg-[color:var(--glass-bg)] transition-colors uppercase tracking-widest">
                  History
                </a>
                <button 
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setShowSettings(true);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-[13px] font-bold text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:bg-[color:var(--glass-bg)] transition-colors uppercase tracking-widest text-left"
                >
                  Settings
                </button>
              </nav>
              <div className="p-6 border-t border-[color:var(--glass-border)]">
                <div className="text-[10px] font-mono text-[color:var(--text-secondary)] uppercase tracking-widest text-center">
                  v1.0.5
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <main className="relative z-10 max-w-7xl mx-auto px-6 py-8 md:py-12">
        {/* Hero Section */}
        <div className="mb-12 md:mb-16 max-w-3xl">
          <h2 className="text-5xl md:text-6xl lg:text-7xl font-black tracking-tighter text-[color:var(--text-primary)] mb-4 md:mb-6 font-display leading-[1.1] md:leading-[0.9]">
            Find high-intent leads <span className="text-netflix-red">instantly.</span>
          </h2>
          <p className="text-lg md:text-xl text-[color:var(--text-secondary)] leading-relaxed font-medium max-w-xl">
            Extract business data from Google Maps to power your agency's outreach. 
            Identify businesses without websites and start scaling today.
          </p>
        </div>

        {/* Search Controls */}
        <section className="glass-card p-6 md:p-10 mb-12 md:mb-16 relative">
          <div className="absolute top-0 left-0 w-full h-1 glossy-gradient rounded-t-2xl" />
          <form onSubmit={handleSearch} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-12 gap-6 lg:gap-8">
            <div className="lg:col-span-3 space-y-2 lg:space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--text-secondary)] ml-1">Business Category</label>
              <div className="relative">
                <CustomSelect
                  value={selectedCategory}
                  onChange={setSelectedCategory}
                  placeholder="Select Category"
                  options={[
                    ...CATEGORIES.map(cat => ({ value: cat, label: cat })),
                    { value: "Custom", label: "Custom..." }
                  ]}
                />
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

            <div className="lg:col-span-3 space-y-2 lg:space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--text-secondary)] ml-1">Country</label>
              <div className="relative">
                <CustomSelect
                  value={selectedCountryCode}
                  onChange={setSelectedCountryCode}
                  placeholder="Select Country"
                  options={countries.map(c => ({ value: c.isoCode, label: c.name }))}
                />
              </div>
            </div>

            <div className="lg:col-span-3 space-y-2 lg:space-y-3">
              <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--text-secondary)] ml-1">City</label>
              <div className="relative">
                <CustomSelect
                  value={selectedCity}
                  onChange={setSelectedCity}
                  placeholder={selectedCountryCode ? 'All Cities (Optional)' : 'Select Country First'}
                  disabled={!selectedCountryCode}
                  options={[
                    { value: "", label: selectedCountryCode ? 'All Cities (Optional)' : 'Select Country First' },
                    ...cities.map(city => ({ value: city.name, label: city.name }))
                  ]}
                />
              </div>
            </div>

            <div className="lg:col-span-3 flex items-end sm:mt-2 lg:mt-0">
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

          {/* Saved Searches */}
          <div className="mt-8 pt-6 border-t border-[color:var(--glass-border)] flex flex-wrap items-center gap-4">
            <button
              onClick={handleSaveSearch}
              disabled={!selectedCategory || !selectedCountryCode || isSearching}
              className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-[color:var(--glass-bg)] border border-[color:var(--glass-border)] text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] hover:bg-[color:var(--btn-ghost-hover)] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Bookmark size={16} className="text-netflix-red" />
              Save Current Search
            </button>

            {savedSearches.length > 0 && (
              <div className="w-px h-6 bg-[color:var(--glass-border)] mx-2 hidden sm:block" />
            )}

            {savedSearches.map(search => (
              <div 
                key={search.id}
                onClick={() => handleLoadSearch(search)}
                className="group flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold bg-[color:var(--bg-secondary)] border border-[color:var(--glass-border)] cursor-pointer hover:border-netflix-red/50 transition-all shadow-lg"
              >
                <Search size={14} className="text-[color:var(--text-secondary)] group-hover:text-netflix-red transition-colors" />
                <span className="text-[color:var(--text-primary)]">{search.name}</span>
                <button 
                  onClick={(e) => handleDeleteSearch(search.id, e)}
                  className="ml-2 p-1 rounded-full hover:bg-[color:var(--btn-ghost-hover)] text-[color:var(--text-secondary)] hover:text-netflix-red transition-colors"
                  aria-label="Delete saved search"
                >
                  <X size={12} />
                </button>
              </div>
            ))}
          </div>
        </section>

        {/* Results Section */}
        <div className="space-y-10">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <h2 className="text-2xl md:text-3xl font-black tracking-tight text-[color:var(--text-primary)] font-display">
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
                  <div className="flex items-center gap-3 bg-[color:var(--glass-bg)] px-5 py-2.5 rounded-lg border border-[color:var(--glass-border)] shadow-xl text-[11px] font-black uppercase tracking-widest text-[color:var(--text-secondary)] cursor-pointer hover:bg-[color:var(--btn-ghost-hover)] transition-all">
                    <ArrowUpDown size={14} className="text-netflix-red" />
                    <span>Sort: {sortBy === 'none' ? 'Default' : sortBy.charAt(0).toUpperCase() + sortBy.slice(1)}</span>
                    <ChevronDown size={14} />
                  </div>
                  <div className="absolute right-0 top-full mt-2 w-44 bg-[color:var(--bg-secondary)] border border-[color:var(--glass-border)] rounded-xl shadow-2xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-20 overflow-hidden py-1">
                    {(['none', 'rating', 'reviews', 'name'] as SortOption[]).map(option => (
                      <button
                        key={option}
                        onClick={() => setSortBy(option)}
                        className={cn(
                          "w-full text-left px-5 py-3 text-[10px] font-black uppercase tracking-[0.2em] transition-colors",
                          sortBy === option ? "bg-netflix-red text-[#FFFFFF]" : "text-[color:var(--text-secondary)] hover:bg-[color:var(--glass-bg)] hover:text-[color:var(--text-primary)]"
                        )}
                      >
                        {option === 'none' ? 'Default' : option}
                      </button>
                    ))}
                  </div>
                </div>
                <button
                  onClick={downloadCSV}
                  className="flex items-center gap-3 text-[11px] font-black uppercase tracking-widest text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] transition-all bg-[color:var(--glass-bg)] px-5 py-2.5 rounded-lg border border-[color:var(--glass-border)] shadow-xl hover:bg-[color:var(--btn-ghost-hover)]"
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
                      className="group glass-card p-8 hover:bg-white/10 hover:border-white/20 transition-all duration-500 relative netflix-shadow"
                    >
                      {/* Glossy Overlay */}
                      <div className="absolute top-0 left-0 w-full h-1 glossy-gradient rounded-t-2xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      
                      <div className="relative z-10">
                        <div className="flex justify-between items-start mb-8">
                          <span className="text-[9px] font-black uppercase tracking-[0.2em] text-netflix-red bg-netflix-red/10 px-3 py-1.5 rounded-md border border-netflix-red/20">
                            {lead.category}
                          </span>
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-2 px-2.5 py-1.5 bg-white/5 rounded-lg border border-white/5">
                              <Star size={12} fill="#E50914" className="text-netflix-red" />
                                <span className="text-[11px] font-black text-[color:var(--text-primary)] font-mono">{lead.rating || 'N/A'}</span>
                              <span className="text-[color:var(--text-secondary)] text-[10px] font-bold">({lead.reviewsCount || 0})</span>
                            </div>
                            <div className="relative">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setActiveMenu(activeMenu === idx ? null : idx);
                                }}
                                className="p-2 hover:bg-[color:var(--btn-ghost-hover)] rounded-lg transition-colors text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
                              >
                                <MoreHorizontal size={20} />
                              </button>
                              <AnimatePresence>
                                {activeMenu === idx && (
                                  <motion.div
                                    initial={{ opacity: 0, scale: 0.95, y: 10 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.95, y: 10 }}
                                    className="absolute right-0 top-full mt-3 w-52 bg-[color:var(--bg-secondary)] border border-[color:var(--glass-border)] rounded-xl shadow-2xl z-30 overflow-hidden py-2"
                                  >
                                    <button 
                                      onClick={() => copyToClipboard(`${lead.name}\n${lead.address}\nPhone: ${lead.phone || 'N/A'}\nEmail: ${lead.email || 'N/A'}\nWhatsApp: ${lead.whatsapp || 'N/A'}`)}
                                      className="w-full px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-[color:var(--text-secondary)] hover:bg-[color:var(--glass-bg)] hover:text-[color:var(--text-primary)] flex items-center gap-4 transition-colors"
                                    >
                                      <Copy size={14} className="text-netflix-red" />
                                      Copy Details
                                    </button>
                                    {lead.phone && (
                                      <a 
                                        href={`tel:${lead.phone}`}
                                        className="w-full px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-[color:var(--text-secondary)] hover:bg-[color:var(--glass-bg)] hover:text-[color:var(--text-primary)] flex items-center gap-4 transition-colors"
                                      >
                                        <PhoneCall size={14} className="text-netflix-red" />
                                        Call Business
                                      </a>
                                    )}
                                    {lead.email && (
                                      <a 
                                        href={`mailto:${lead.email}`}
                                        className="w-full px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-[color:var(--text-secondary)] hover:bg-[color:var(--glass-bg)] hover:text-[color:var(--text-primary)] flex items-center gap-4 transition-colors"
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
                                        className="w-full px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-[color:var(--text-secondary)] hover:bg-[color:var(--glass-bg)] hover:text-[color:var(--text-primary)] flex items-center gap-4 transition-colors"
                                      >
                                        <WhatsAppIcon size={14} className="text-emerald-500" />
                                        WhatsApp
                                      </a>
                                    )}
                                    <button 
                                      onClick={() => copyToClipboard(lead.mapsUrl)}
                                      className="w-full px-5 py-3 text-left text-[10px] font-black uppercase tracking-widest text-[color:var(--text-secondary)] hover:bg-[color:var(--glass-bg)] hover:text-[color:var(--text-primary)] flex items-center gap-4 transition-colors"
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
                        
                        <h3 className="font-black text-xl md:text-2xl mb-4 text-[color:var(--text-primary)] group-hover:text-netflix-red transition-colors leading-tight font-display">
                          {lead.name}
                        </h3>
                        
                        <div className="space-y-4 mb-10">
                          <div className="flex items-start gap-4 text-[color:var(--text-secondary)]">
                            <MapPin size={18} className="shrink-0 mt-0.5 text-netflix-red/60" />
                            <p className="text-sm leading-relaxed line-clamp-2 font-medium">{lead.address}</p>
                          </div>
                          {lead.phone && (
                            <div className="flex items-center gap-4 text-[color:var(--text-secondary)]">
                              <Phone size={18} className="shrink-0 text-netflix-red/60" />
                              <p className="text-sm font-mono font-bold tracking-tight">{lead.phone}</p>
                            </div>
                          )}
                          {lead.email && (
                            <a 
                              href={`mailto:${lead.email}`}
                              className="flex items-center gap-4 text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)] transition-colors group/link"
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

                        <div className="flex items-center justify-between pt-8 border-t border-[color:var(--glass-border)]">
                          <div className="flex items-center gap-2">
                            {lead.hasWebsite ? (
                              <div className="flex items-center gap-1.5 text-[color:var(--text-secondary)] bg-[color:var(--glass-bg)] px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest border border-[color:var(--glass-border)]">
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
                            className="w-10 h-10 flex items-center justify-center text-[color:var(--text-secondary)] hover:text-netflix-red hover:bg-[color:var(--glass-bg)] rounded-xl transition-all border border-transparent hover:border-[color:var(--glass-border)]"
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
                className="glass-card p-12 md:p-24 text-center border-[color:var(--glass-border)]"
              >
                <div className="w-20 h-20 md:w-24 md:h-24 bg-[color:var(--glass-bg)] rounded-full flex items-center justify-center mx-auto mb-6 md:mb-8 border border-[color:var(--glass-border)] shadow-2xl">
                  <Search className="text-[color:var(--text-secondary)] opacity-50" size={32} strokeWidth={1.5} />
                </div>
                <h3 className="text-2xl md:text-3xl font-black text-[color:var(--text-primary)] mb-4 font-display">Ready to find leads?</h3>
                <p className="text-[color:var(--text-secondary)] max-w-sm mx-auto font-medium text-base md:text-lg">
                  Select a category and location above to start generating high-quality business leads.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-[color:var(--glass-border)] py-12 md:py-20 relative z-10 transition-colors duration-300">
        <div className="max-w-7xl mx-auto px-6 flex flex-col md:flex-row justify-between items-center gap-8 md:gap-12">
          <div className="flex items-center gap-4 opacity-70 grayscale hover:grayscale-0 hover:opacity-100 transition-all duration-700">
            <div className="w-10 h-10 bg-[color:var(--glass-bg)] rounded-xl flex items-center justify-center">
              <MapPin size={20} className="text-netflix-red" />
            </div>
            <span className="text-xl font-black tracking-tighter text-[color:var(--text-primary)] font-display uppercase">LEAD<span className="text-netflix-red">GEN</span></span>
          </div>
          <div className="flex flex-wrap justify-center md:justify-end gap-6 md:gap-10 text-[10px] font-black uppercase tracking-[0.3em] text-[color:var(--text-secondary)]">
            <a href="#" className="hover:text-netflix-red transition-colors">Privacy</a>
            <a href="#" className="hover:text-netflix-red transition-colors">Terms</a>
            <a href="#" className="hover:text-netflix-red transition-colors">API Docs</a>
            <a href="#" className="hover:text-netflix-red transition-colors">Support</a>
          </div>
          <p className="text-[10px] font-mono text-[color:var(--text-secondary)] uppercase tracking-widest text-center md:text-left">
            © 2026 LeadGen Intelligence. All rights reserved.
          </p>
        </div>
      </footer>
      {/* Settings Modal */}
      <AnimatePresence>
        {showSettings && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 md:px-6">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setShowSettings(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-md"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="relative w-full max-w-xl max-h-[90vh] flex flex-col bg-[color:var(--bg-secondary)] border border-[color:var(--glass-border)] rounded-2xl netflix-shadow"
            >
              <div className="absolute top-0 left-0 w-full h-1 glossy-gradient rounded-t-2xl" />
              
              <div className="p-6 md:p-8 overflow-y-visible flex-1">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 md:w-12 md:h-12 bg-netflix-red/10 rounded-xl flex items-center justify-center text-netflix-red border border-netflix-red/20">
                      <Settings size={22} className="md:w-6 md:h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl md:text-2xl font-black text-[color:var(--text-primary)] font-display">Search Settings</h3>
                      <p className="text-[color:var(--text-secondary)] text-[10px] md:text-xs font-bold uppercase tracking-widest mt-1">Configure your lead filters</p>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowSettings(false)}
                    className="p-2 hover:bg-[color:var(--btn-ghost-hover)] rounded-lg transition-colors text-[color:var(--text-secondary)] hover:text-[color:var(--text-primary)]"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="space-y-4">
                  {/* Filter: No Website */}
                  <div className="flex items-center justify-between p-4 bg-[color:var(--glass-bg)] rounded-2xl border border-[color:var(--glass-border)] hover:border-netflix-red/30 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-[color:var(--glass-bg)] rounded-lg flex items-center justify-center text-[color:var(--text-secondary)] group-hover:text-netflix-red transition-colors border border-[color:var(--glass-border)]">
                        <Globe size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[color:var(--text-primary)]">Exclude Businesses with Websites</p>
                        <p className="text-[11px] md:text-xs text-[color:var(--text-secondary)] font-medium">Only show leads that need a new website</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSettings(s => ({ ...s, excludeWithWebsites: !s.excludeWithWebsites }))}
                      className={cn(
                        "w-12 h-6 rounded-full transition-all relative shrink-0",
                        settings.excludeWithWebsites ? "bg-netflix-red" : "bg-[color:var(--glass-border)]"
                      )}
                    >
                      <motion.div 
                        animate={{ x: settings.excludeWithWebsites ? 24 : 4 }}
                        className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-lg"
                      />
                    </button>
                  </div>

                  {/* Filter: Require Email */}
                  <div className="flex items-center justify-between p-4 bg-[color:var(--glass-bg)] rounded-2xl border border-[color:var(--glass-border)] hover:border-netflix-red/30 transition-all group">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 bg-[color:var(--glass-bg)] rounded-lg flex items-center justify-center text-[color:var(--text-secondary)] group-hover:text-netflix-red transition-colors border border-[color:var(--glass-border)]">
                        <Mail size={18} />
                      </div>
                      <div>
                        <p className="text-sm font-bold text-[color:var(--text-primary)]">Require Email Contact</p>
                        <p className="text-[11px] md:text-xs text-[color:var(--text-secondary)] font-medium">Only show leads that have a public email address</p>
                      </div>
                    </div>
                    <button
                      onClick={() => setSettings(s => ({ ...s, requireEmail: !s.requireEmail }))}
                      className={cn(
                        "w-12 h-6 rounded-full transition-all relative shrink-0",
                        settings.requireEmail ? "bg-netflix-red" : "bg-[color:var(--glass-border)]"
                      )}
                    >
                      <motion.div 
                        animate={{ x: settings.requireEmail ? 24 : 4 }}
                        className="absolute top-1 w-4 h-4 bg-white rounded-full shadow-lg"
                      />
                    </button>
                  </div>
                </div>

                <div className="space-y-6 md:space-y-8 mt-6 md:mt-8">
                  {/* Quality Thresholds */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                    <div className="space-y-2 md:space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--text-secondary)] ml-1 flex items-center gap-2">
                        <Star size={12} className="text-amber-500" />
                        Min Rating
                      </label>
                      <CustomSelect
                        value={String(settings.minRating)}
                        onChange={(val) => setSettings(s => ({ ...s, minRating: Number(val) }))}
                        placeholder="Any Rating"
                        className="text-xs"
                        options={[
                          { value: "0", label: "Any Rating" },
                          { value: "3", label: "3.0+ Stars" },
                          { value: "4", label: "4.0+ Stars" },
                          { value: "4.5", label: "4.5+ Stars" }
                        ]}
                      />
                    </div>
                    <div className="space-y-2 md:space-y-3">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--text-secondary)] ml-1 flex items-center gap-2">
                        <MessageCircle size={12} className="text-netflix-red" />
                        Min Reviews
                      </label>
                      <CustomSelect
                        value={String(settings.minReviews)}
                        onChange={(val) => setSettings(s => ({ ...s, minReviews: Number(val) }))}
                        placeholder="Any Reviews"
                        className="text-xs"
                        options={[
                          { value: "0", label: "Any Reviews" },
                          { value: "10", label: "10+ Reviews" },
                          { value: "50", label: "50+ Reviews" },
                          { value: "100", label: "100+ Reviews" }
                        ]}
                      />
                    </div>
                  </div>

                  {/* Results Limit */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-[color:var(--text-secondary)] ml-1 flex items-center gap-2">
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
                      className="w-full h-1.5 bg-[color:var(--glass-border)] rounded-lg appearance-none cursor-pointer accent-netflix-red"
                    />
                    <div className="flex justify-between text-[9px] font-bold text-[color:var(--text-secondary)] uppercase tracking-widest">
                      <span>Fast (10)</span>
                      <span>Deep (50)</span>
                    </div>
                  </div>
                </div>

                <div className="mt-8 md:mt-10 pt-6 md:pt-8 border-t border-[color:var(--glass-border)]">
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

      {/* Theme Toggle Floating Button */}
      <button
        onClick={() => setIsDarkMode(!isDarkMode)}
        className="fixed bottom-6 right-6 z-50 p-4 rounded-full glass-card hover:scale-110 transition-transform flex items-center justify-center border-[color:var(--glass-border)] shadow-2xl"
        title={`Switch to ${isDarkMode ? 'Light' : 'Dark'} Mode`}
      >
        {isDarkMode ? (
          <Sun size={24} className="text-[#FFFFFF]" />
        ) : (
          <Moon size={24} className="text-[#000000]" />
        )}
      </button>
    </div>
  );
}
