import React from 'react';
import { Image, Video } from 'lucide-react';
import { MediaType, DateFilter } from '../services/api';

interface FiltersProps {
  selectedMediaType: MediaType;
  setSelectedMediaType: (type: MediaType) => void;
  selectedDateFilter: DateFilter;
  setSelectedDateFilter: (filter: DateFilter) => void;
}

export const Filters: React.FC<FiltersProps> = ({
  selectedMediaType,
  setSelectedMediaType,
  selectedDateFilter,
  setSelectedDateFilter,
}) => {
  return (
    <div className="space-y-8">
      {/* Media Types */}
      <div className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-base font-medium text-brand-charcoal font-heading">Media Type</h3>
          <p className="text-sm text-brand-charcoal/60 font-body">Filter by content type</p>
        </div>
        
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => setSelectedMediaType('all')}
            className={`group relative flex items-center justify-center px-4 py-3 rounded-xl border transition-all duration-200 font-body ${
              selectedMediaType === 'all'
                ? 'bg-brand-forest/10 border-brand-forest text-brand-forest shadow-sm ring-1 ring-brand-forest/20'
                : 'border-brand-softgray/30 text-brand-charcoal hover:bg-brand-softgray/20 hover:border-brand-softgray/50'
            }`}
          >
            <span className="relative text-sm font-medium">All Files</span>
          </button>

          <button
            onClick={() => setSelectedMediaType('images')}
            className={`group relative flex items-center justify-center px-4 py-3 rounded-xl border transition-all duration-200 font-body ${
              selectedMediaType === 'images'
                ? 'bg-brand-forest/10 border-brand-forest text-brand-forest shadow-sm ring-1 ring-brand-forest/20'
                : 'border-brand-softgray/30 text-brand-charcoal hover:bg-brand-softgray/20 hover:border-brand-softgray/50'
            }`}
          >
            <Image className={`w-4 h-4 mr-2 transition-colors duration-200 ${
              selectedMediaType === 'images' ? 'text-brand-forest' : 'text-brand-charcoal/60'
            }`} />
            <span className="relative text-sm font-medium">Images</span>
          </button>

          <button
            onClick={() => setSelectedMediaType('videos')}
            className={`group relative flex items-center justify-center px-4 py-3 rounded-xl border transition-all duration-200 font-body ${
              selectedMediaType === 'videos'
                ? 'bg-brand-forest/10 border-brand-forest text-brand-forest shadow-sm ring-1 ring-brand-forest/20'
                : 'border-brand-softgray/30 text-brand-charcoal hover:bg-brand-softgray/20 hover:border-brand-softgray/50'
            }`}
          >
            <Video className={`w-4 h-4 mr-2 transition-colors duration-200 ${
              selectedMediaType === 'videos' ? 'text-brand-forest' : 'text-brand-charcoal/60'
            }`} />
            <span className="relative text-sm font-medium">Videos</span>
          </button>
        </div>
      </div>

      {/* Date Range */}
      <div className="space-y-4">
        <div className="space-y-1">
          <h3 className="text-base font-medium text-brand-charcoal font-heading">Date Range</h3>
          <p className="text-sm text-brand-charcoal/60 font-body">When files were created</p>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-2">
          <button
            onClick={() => setSelectedDateFilter('all')}
            className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all duration-200 font-body ${
              selectedDateFilter === 'all'
                ? 'bg-brand-forest text-brand-offwhite border-brand-forest shadow-sm'
                : 'border-brand-softgray/30 text-brand-charcoal/70 hover:bg-brand-softgray/20 hover:border-brand-softgray/50'
            }`}
          >
            All Time
          </button>

          <button
            onClick={() => setSelectedDateFilter('today')}
            className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all duration-200 font-body ${
              selectedDateFilter === 'today'
                ? 'bg-brand-forest text-brand-offwhite border-brand-forest shadow-sm'
                : 'border-brand-softgray/30 text-brand-charcoal/70 hover:bg-brand-softgray/20 hover:border-brand-softgray/50'
            }`}
          >
            Today
          </button>

          <button
            onClick={() => setSelectedDateFilter('this_week')}
            className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all duration-200 font-body ${
              selectedDateFilter === 'this_week'
                ? 'bg-brand-forest text-brand-offwhite border-brand-forest shadow-sm'
                : 'border-brand-softgray/30 text-brand-charcoal/70 hover:bg-brand-softgray/20 hover:border-brand-softgray/50'
            }`}
          >
            This Week
          </button>

          <button
            onClick={() => setSelectedDateFilter('this_month')}
            className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all duration-200 font-body ${
              selectedDateFilter === 'this_month'
                ? 'bg-brand-forest text-brand-offwhite border-brand-forest shadow-sm'
                : 'border-brand-softgray/30 text-brand-charcoal/70 hover:bg-brand-softgray/20 hover:border-brand-softgray/50'
            }`}
          >
            This Month
          </button>

          <button
            onClick={() => setSelectedDateFilter('last_month')}
            className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all duration-200 font-body ${
              selectedDateFilter === 'last_month'
                ? 'bg-brand-forest text-brand-offwhite border-brand-forest shadow-sm'
                : 'border-brand-softgray/30 text-brand-charcoal/70 hover:bg-brand-softgray/20 hover:border-brand-softgray/50'
            }`}
          >
            Last Month
          </button>

          <button
            onClick={() => setSelectedDateFilter('this_year')}
            className={`px-3 py-2 text-xs font-medium rounded-lg border transition-all duration-200 font-body ${
              selectedDateFilter === 'this_year'
                ? 'bg-brand-forest text-brand-offwhite border-brand-forest shadow-sm'
                : 'border-brand-softgray/30 text-brand-charcoal/70 hover:bg-brand-softgray/20 hover:border-brand-softgray/50'
            }`}
          >
            This Year
          </button>
        </div>
      </div>
    </div>
  );
};
