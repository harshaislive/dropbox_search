import React from 'react';
import { Calendar, Image, Video } from 'lucide-react';
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
  // Initialize with default selections
  const [selectedTypes, setSelectedTypes] = React.useState<string[]>(
    selectedMediaType.fileTypes ? selectedMediaType.fileTypes.split(',').map(t => t.trim()) : ['jpg', 'jpeg', 'png', 'gif']
  );
  
  // Set default date preset to "This Year"
  const [datePreset, setDatePreset] = React.useState('thisYear');
  const [showCustomDateRange, setShowCustomDateRange] = React.useState(false);

  // Handle initial mount
  React.useEffect(() => {
    // If no filters are set, set defaults
    if (!selectedMediaType.fileTypes && !selectedDateFilter.startDate && !selectedDateFilter.endDate) {
      const defaultFilters: DateFilter = {
        ...selectedDateFilter,
        startDate: new Date(),
        endDate: new Date()
      };
      setSelectedDateFilter(defaultFilters);
    }
  }, []);

  const handleMediaTypeChange = (typeValue: string) => {
    const extensions = typeValue.split(',').map(ext => ext.trim());
    const isSelected = extensions.some(ext => selectedTypes.includes(ext));
    
    let newSelectedTypes: string[];
    if (isSelected) {
      // Remove this media type
      newSelectedTypes = selectedTypes.filter(type => !extensions.includes(type));
    } else {
      // Add this media type
      newSelectedTypes = [...selectedTypes, ...extensions];
    }

    // Remove duplicates
    newSelectedTypes = [...new Set(newSelectedTypes)];
    
    setSelectedTypes(newSelectedTypes);
    setSelectedMediaType({
      ...selectedMediaType,
      fileTypes: newSelectedTypes.join(',')
    });
  };

  const handleDatePresetChange = (preset: string) => {
    setDatePreset(preset);
    setShowCustomDateRange(preset === 'custom');

    if (preset !== 'custom') {
      const datePreset = [
        { value: 'today', label: 'Today', getDates: () => ({ start: new Date(), end: new Date() }) },
        { value: 'yesterday', label: 'Yesterday', getDates: () => ({ start: new Date(new Date().getTime() - 86400000), end: new Date(new Date().getTime() - 86400000) }) },
        { value: 'last7', label: 'Last 7 Days', getDates: () => ({ start: new Date(new Date().getTime() - 604800000), end: new Date() }) },
        { value: 'last30', label: 'Last 30 Days', getDates: () => ({ start: new Date(new Date().getTime() - 2592000000), end: new Date() }) },
        { value: 'lastMonth', label: 'Last Month', getDates: () => ({ start: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1), end: new Date() }) },
        { value: 'thisYear', label: 'This Year', getDates: () => ({ start: new Date(new Date().getFullYear(), 0, 1), end: new Date() }) },
        { value: 'custom', label: 'Custom Range', getDates: () => ({ start: null, end: null }) },
      ].find(d => d.value === preset);
      if (datePreset) {
        const { start, end } = datePreset.getDates();
        setSelectedDateFilter({
          ...selectedDateFilter,
          startDate: start,
          endDate: end
        });
      }
    }
  };

  const isTypeSelected = (typeValue: string): boolean => {
    const extensions = typeValue.split(',').map(ext => ext.trim());
    return extensions.some(ext => selectedTypes.includes(ext));
  };

  return (
    <div className="space-y-6">
      {/* Media Types */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Media Type</h3>
        <p className="text-sm text-gray-600 mb-3">Filter by images or videos</p>
        <div className="flex gap-3">
          [
            { value: 'jpg,jpeg,png,gif', label: 'Images', icon: Image },
            { value: 'mp4,mov,avi,mkv,webm', label: 'Videos', icon: Video },
          ].map(type => (
            <button
              key={type.value}
              onClick={() => handleMediaTypeChange(type.value)}
              className={`flex-1 flex items-center justify-center px-4 py-3 rounded-lg border transition-all ${
                isTypeSelected(type.value)
                  ? 'bg-blue-50 border-blue-500 text-blue-700 shadow-sm'
                  : 'border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <type.icon className="w-5 h-5 mr-2" />
              <span className="text-sm font-medium">{type.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Date Range */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Date Range</h3>
        <div className="space-y-4">
          <select
            value={datePreset}
            onChange={(e) => handleDatePresetChange(e.target.value)}
            className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
          >
            [
              { value: 'today', label: 'Today' },
              { value: 'yesterday', label: 'Yesterday' },
              { value: 'last7', label: 'Last 7 Days' },
              { value: 'last30', label: 'Last 30 Days' },
              { value: 'lastMonth', label: 'Last Month' },
              { value: 'thisYear', label: 'This Year' },
              { value: 'custom', label: 'Custom Range' },
            ].map(preset => (
              <option key={preset.value} value={preset.value}>
                {preset.label}
              </option>
            ))}
          </select>

          {showCustomDateRange && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Start Date</label>
                <input
                  type="date"
                  value={selectedDateFilter.startDate ? selectedDateFilter.startDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => {
                    const date = e.target.value ? new Date(e.target.value) : null;
                    setSelectedDateFilter({
                      ...selectedDateFilter,
                      startDate: date
                    });
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">End Date</label>
                <input
                  type="date"
                  value={selectedDateFilter.endDate ? selectedDateFilter.endDate.toISOString().split('T')[0] : ''}
                  onChange={(e) => {
                    const date = e.target.value ? new Date(e.target.value) : null;
                    setSelectedDateFilter({
                      ...selectedDateFilter,
                      endDate: date
                    });
                  }}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Sort By */}
      <div>
        <h3 className="text-lg font-medium text-gray-900 mb-2">Sort By</h3>
        <select
          value={selectedMediaType.sortBy}
          onChange={(e) => setSelectedMediaType({ ...selectedMediaType, sortBy: e.target.value })}
          className="block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
        >
          <option value="relevance">Relevance</option>
          <option value="date">Date Modified</option>
          <option value="name">Name</option>
        </select>
      </div>
    </div>
  );
}