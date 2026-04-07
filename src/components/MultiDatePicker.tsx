"use client";

import React, { useEffect, useRef, useState } from "react";
import {
    addMonths,
    endOfMonth,
    endOfWeek,
    format,
    isSameDay,
    isSameMonth,
    isToday,
    startOfDay,
    startOfMonth,
    startOfWeek,
    eachDayOfInterval,
    subMonths,
} from "date-fns";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";

interface MultiDatePickerProps {
    value: Date[];
    onChange: (dates: Date[]) => void;
    placeholder?: string;
    accent?: "pink" | "emerald" | "amber" | "sky";
    minDate?: Date;
    maxDate?: Date;
}

const accentMap = {
    pink: {
        ring: "border-pink-500 ring-1 ring-pink-500/50",
        icon: "text-pink-400",
        selected: "bg-gradient-to-br from-pink-600 to-purple-600 text-white shadow-lg shadow-pink-900/20 hover:from-pink-500 hover:to-purple-500",
        today: "text-pink-400",
        dot: "bg-pink-500",
    },
    emerald: {
        ring: "border-emerald-400 ring-1 ring-emerald-400/50",
        icon: "text-emerald-300",
        selected: "bg-gradient-to-br from-emerald-500 to-sky-500 text-white shadow-lg shadow-emerald-900/20 hover:from-emerald-400 hover:to-sky-400",
        today: "text-emerald-300",
        dot: "bg-emerald-400",
    },
    amber: {
        ring: "border-amber-400 ring-1 ring-amber-400/50",
        icon: "text-amber-300",
        selected: "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-900/20 hover:from-amber-300 hover:to-orange-400",
        today: "text-amber-300",
        dot: "bg-amber-400",
    },
    sky: {
        ring: "border-sky-400 ring-1 ring-sky-400/50",
        icon: "text-sky-300",
        selected: "bg-gradient-to-br from-sky-500 to-cyan-500 text-white shadow-lg shadow-sky-900/20 hover:from-sky-400 hover:to-cyan-400",
        today: "text-sky-300",
        dot: "bg-sky-400",
    },
} as const;

function normalizeDay(date: Date) {
    return startOfDay(date);
}

export default function MultiDatePicker({
    value,
    onChange,
    placeholder = "Select dates",
    accent = "amber",
    minDate,
    maxDate,
}: MultiDatePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDates, setSelectedDates] = useState<Date[]>(value.map(normalizeDay));

    const containerRef = useRef<HTMLDivElement>(null);
    const accentStyles = accentMap[accent];

    useEffect(() => {
        setSelectedDates(value.map(normalizeDay));
    }, [value]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleOpen = () => setIsOpen((prev) => !prev);
    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    const isDisabled = (day: Date) =>
        (minDate && day < startOfDay(minDate)) || (maxDate && day > startOfDay(maxDate));

    const handleDateClick = (day: Date) => {
        if (isDisabled(day)) return;
        const normalized = normalizeDay(day);
        const exists = selectedDates.some((d) => isSameDay(d, normalized));
        const next = exists ? selectedDates.filter((d) => !isSameDay(d, normalized)) : [...selectedDates, normalized];
        setSelectedDates(next);
        onChange(next);
    };

    const clearDates = () => {
        setSelectedDates([]);
        onChange([]);
    };

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);
    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });
    const weekDays = ["S", "M", "T", "W", "T", "F", "S"];

    const displayValue =
        selectedDates.length === 0
            ? placeholder
            : selectedDates.length === 1
                ? format(selectedDates[0], "dd/MM/yyyy")
                : `${selectedDates.length} dates selected`;

    return (
        <div className="relative w-full" ref={containerRef}>
            <div
                onClick={toggleOpen}
                className={`
                    w-full flex items-center justify-between px-4 py-3 rounded-xl border cursor-pointer transition-all
                    ${isOpen ? `${accentStyles.ring} bg-[var(--background-elevated)]` : 'border-[var(--border)] bg-[var(--background-elevated)]/70 hover:bg-[var(--card-hover)]/70'}
                `}
            >
                <div className="flex items-center gap-3 text-[var(--text-muted)]">
                    <CalendarIcon className={`w-4 h-4 ${selectedDates.length ? accentStyles.icon : 'text-[var(--text-dim)]'}`} />
                    <span className={selectedDates.length ? "text-white font-medium" : "text-[var(--text-dim)]"}>
                        {displayValue}
                    </span>
                </div>
                {selectedDates.length > 0 && (
                    <button
                        onClick={(event) => {
                            event.stopPropagation();
                            clearDates();
                        }}
                        className="p-1 rounded-md text-[var(--text-dim)] hover:text-white hover:bg-white/10 transition-colors"
                        aria-label="Clear dates"
                    >
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {isOpen && (
                <div className="absolute top-full mt-2 left-0 z-50 w-full md:w-[320px] bg-[var(--background-elevated)] border border-[var(--border)] rounded-xl shadow-2xl shadow-black overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between p-4 border-b border-[var(--border)] bg-[var(--card)]">
                        <button onClick={prevMonth} className="p-1 hover:bg-white/10 rounded-md text-[var(--text-muted)] hover:text-white transition-colors">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <span className="text-sm font-semibold text-white">{format(currentMonth, "MMMM yyyy")}</span>
                        <button onClick={nextMonth} className="p-1 hover:bg-white/10 rounded-md text-[var(--text-muted)] hover:text-white transition-colors">
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>

                    <div className="p-4">
                        <div className="grid grid-cols-7 mb-2">
                            {weekDays.map((d, index) => (
                                <div key={`${d}-${index}`} className="text-center text-xs font-medium text-[var(--text-dim)] py-1">
                                    {d}
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                            {calendarDays.map((day, idx) => {
                                const selected = selectedDates.some((d) => isSameDay(d, day));
                                const currentMonthDay = isSameMonth(day, currentMonth);
                                const today = isToday(day);
                                const disabled = isDisabled(day);

                                return (
                                    <button
                                        key={idx}
                                        onClick={() => handleDateClick(day)}
                                        className={`
                                            h-9 rounded-lg text-sm flex items-center justify-center transition-all relative
                                            ${!currentMonthDay ? 'text-zinc-700' : 'text-[var(--text-muted)] hover:bg-white/5 hover:text-white'}
                                            ${selected ? accentStyles.selected : ''}
                                            ${today && !selected ? `${accentStyles.today} font-semibold` : ''}
                                            ${disabled ? 'opacity-30 pointer-events-none' : ''}
                                        `}
                                    >
                                        {format(day, "d")}
                                        {today && !selected && <div className={`absolute bottom-1.5 w-1 h-1 rounded-full ${accentStyles.dot}`} />}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
