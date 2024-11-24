import React, { useState } from 'react';
import DatePicker from 'react-datepicker';
import { Calendar, Clock } from 'lucide-react';
import "react-datepicker/dist/react-datepicker.css";
import { DateFilter, CustomDateRange } from '../services/api';

interface DateFilterProps {
  dateFilter: DateFilter;
  customRange: CustomDateRange | null;
  onDateFilterChange: (filter: DateFilter, customRange?: CustomDateRange) => void;
}

export const DateFilterComponent: React.FC<DateFilterProps> = ({
  dateFilter,
  customRange,
  onDateFilterChange,
}) => {
  const [showDatePicker, setShowDatePicker] = useState(false);

  const dateFilters: { value: DateFilter; label: string }[] = [
    { value: 'all', label: 'All time' },
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'this_week', label: 'This week' },
    { value: 'last_week', label: 'Last week' },
    { value: 'this_month', label: 'This month' },
    { value: 'last_month', label: 'Last month' },
    { value: 'this_year', label: 'This year' },
    { value: 'custom', label: 'Custom range' },
  ];

  return (
    <div className="relative">
      <div className="flex flex-wrap gap-2">
        {dateFilters.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => {
              if (value === 'custom') {
                setShowDatePicker(true);
              } else {
                onDateFilterChange(value);
              }
            }}
            className={`px-3 py-1 rounded-full flex items-center space-x-1 ${
              dateFilter === value ? 'bg-brand text-white' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {value === 'custom' ? <Calendar className="w-4 h-4" /> : <Clock className="w-4 h-4" />}
            <span>{label}</span>
          </button>
        ))}
      </div>

      {showDatePicker && (
        <div className="absolute top-12 left-0 z-50 bg-white rounded-lg shadow-lg p-4">
          <DatePicker
            selectsRange
            startDate={customRange?.startDate}
            endDate={customRange?.endDate}
            onChange={(dates) => {
              const [start, end] = dates;
              if (start && end) {
                onDateFilterChange('custom', { startDate: start, endDate: end });
                setShowDatePicker(false);
              }
            }}
            inline
          />
        </div>
      )}
    </div>
  );
};
