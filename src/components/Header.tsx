/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useRef, useState } from "react";
import { Calendar, RefreshCw, ChevronDown } from "lucide-react";
import { StadiumIcon } from "./AppIcons";
import { STATSHUB_DATE_SCHEDULE, getMatchCountForDate } from "../data";

interface HeaderProps {
  selectedDate: string;
  setSelectedDate: (date: string) => void;
  isScanning: boolean;
  onStartScan?: () => void;
  onStopScan?: () => void;
  progress: number;
  totalMatches: number;
  currentMatchIndex: number;
  geminiActive?: boolean;
  calendarSchedule?: Array<{ label: string; date: string; count: number }>;
}

export default function Header({
  selectedDate,
  setSelectedDate,
  isScanning,
  progress,
  totalMatches,
  currentMatchIndex,
  calendarSchedule
}: HeaderProps) {
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const currentCount = totalMatches || getMatchCountForDate(selectedDate);
  const activeSchedule = calendarSchedule && calendarSchedule.length > 0 ? calendarSchedule : STATSHUB_DATE_SCHEDULE;

  const selectedScheduleItem = activeSchedule.find((item) => item.date === selectedDate);
  const isCustomDate = !selectedScheduleItem;

  const handleOpenPicker = () => {
    if (inputRef.current) {
      if ("showPicker" in inputRef.current) {
        try {
          inputRef.current.showPicker();
          setIsCalendarOpen(false);
          return;
        } catch {
          // Fallback
        }
      }
      inputRef.current.focus();
      inputRef.current.click();
    }
  };

  return (
    <header className="border-b border-slate-200 bg-white shadow-3xs relative z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3">
        
        {/* Top Bar: Brand Title & Unified Calendar Button on the Same Row */}
        <div className="flex items-center justify-between gap-4">
          
          {/* Brand/Title */}
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-2xs">
              <StadiumIcon className="h-6 w-6 text-emerald-400" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 flex items-center gap-2">
                Mp7Stats
              </h1>
            </div>
          </div>

          {/* Unified Calendar Dropdown Toggle (Right next to Logo) */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setIsCalendarOpen(!isCalendarOpen)}
              className="flex items-center gap-2 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs sm:text-sm font-bold shadow-2xs transition-all cursor-pointer"
            >
              <Calendar className="h-4 w-4 text-emerald-400" />
              <span>
                {selectedScheduleItem ? selectedScheduleItem.label : selectedDate.split("-").reverse().join("/")}
              </span>
              <span className="bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full text-[10px] font-extrabold">
                {currentCount} jogos
              </span>
              <ChevronDown className={`h-4 w-4 text-slate-300 transition-transform ${isCalendarOpen ? "rotate-180" : ""}`} />
            </button>

            {/* Expandable Calendar Panel */}
            {isCalendarOpen && (
              <>
                <div className="fixed inset-0 z-20" onClick={() => setIsCalendarOpen(false)} />
                <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-white border border-slate-200 rounded-2xl shadow-xl p-3 z-30 space-y-2 animate-in fade-in zoom-in-95 duration-150">
                  
                  <div className="flex items-center justify-between px-2 pb-2 border-b border-slate-100">
                    <span className="text-[11px] font-bold text-slate-500 uppercase">
                      Calendário StatsHUB
                    </span>
                    <button
                      type="button"
                      onClick={() => setIsCalendarOpen(false)}
                      className="text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
                    >
                      ✕
                    </button>
                  </div>

                  <div className="space-y-1 max-h-64 overflow-y-auto no-scrollbar">
                    
                    {/* Custom Date Button */}
                    <div className="relative">
                      <button
                        type="button"
                        onClick={handleOpenPicker}
                        className="w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors cursor-pointer border border-slate-200"
                      >
                        <span className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 text-emerald-600" />
                          Outra Data (Calendário)...
                        </span>
                      </button>

                      <input
                        ref={inputRef}
                        id="header-date-picker"
                        type="date"
                        value={selectedDate}
                        onChange={(e) => {
                          if (e.target.value) {
                            setSelectedDate(e.target.value);
                            setIsCalendarOpen(false);
                          }
                        }}
                        disabled={isScanning}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full z-10"
                      />
                    </div>

                    {/* Schedule items */}
                    {activeSchedule.map((item) => {
                      const isSelected = selectedDate === item.date;
                      return (
                        <button
                          key={item.date}
                          type="button"
                          onClick={() => {
                            setSelectedDate(item.date);
                            setIsCalendarOpen(false);
                          }}
                          disabled={isScanning}
                          className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                            isSelected
                              ? "bg-slate-900 text-white shadow-2xs"
                              : "bg-white hover:bg-slate-50 text-slate-700 border border-slate-100"
                          }`}
                        >
                          <span>{item.label} ({item.date.split("-").reverse().join("/")})</span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                            isSelected ? "bg-emerald-500 text-slate-950" : "bg-slate-100 text-slate-700 border border-slate-200"
                          }`}>
                            {item.count} jogos
                          </span>
                        </button>
                      );
                    })}

                  </div>

                </div>
              </>
            )}
          </div>

        </div>

        {/* Progress bar when scanning */}
        {isScanning && (
          <div className="pt-1">
            <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
              <span className="font-medium text-slate-700 flex items-center gap-1">
                <RefreshCw className="h-3 w-3 animate-spin text-slate-500" />
                Navegando no fixture oficial do StatsHUB ({selectedDate}) e analisando times...
              </span>
              <span>
                {currentMatchIndex} de {totalMatches} jogos ({Math.round(progress)}%)
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
              <div 
                className="bg-emerald-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

      </div>
    </header>
  );
}
