"use client";

import React, { useState, useEffect, useRef } from "react";
import {
    format,
    addMonths,
    subMonths,
    startOfMonth,
    startOfDay,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    isSameDay,
    isToday,
    setHours,
    setMinutes
} from "date-fns";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, Clock, X } from "lucide-react";

interface DateTimePickerProps {
    value: Date | null;
    onChange: (date: Date) => void;
    placeholder?: string;
    showTime?: boolean;
    accent?: "pink" | "emerald" | "amber" | "sky";
    minDate?: Date;
    maxDate?: Date;
}

export default function DateTimePicker({
    value,
    onChange,
    placeholder = "Select date & time",
    showTime = true,
    accent = "pink",
    minDate,
    maxDate,
}: DateTimePickerProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [selectedDate, setSelectedDate] = useState<Date | null>(value);
    const [selectedTime, setSelectedTime] = useState(value ? format(value, "HH:mm") : "12:00");

    // Refs for click outside
    const containerRef = useRef<HTMLDivElement>(null);

    // Sync state with props
    useEffect(() => {
        setSelectedDate(value);
        if (value) {
            // Only update time string if it's materially different to prevent typing interruption
            // But since 'value' is source of truth, we should respect it.
            // To avoid fighting with the input, we rely on the fact that parent update 
            // will cycle back here.
            setSelectedTime(format(value, "HH:mm"));
        }
    }, [value]);

    // Event handlers
    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => document.removeEventListener("mousedown", handleClickOutside);
    }, []);

    const toggleOpen = () => setIsOpen(!isOpen);

    const nextMonth = () => setCurrentMonth(addMonths(currentMonth, 1));
    const prevMonth = () => setCurrentMonth(subMonths(currentMonth, 1));

    const handleDateClick = (day: Date) => {
        if (minDate && day < startOfDay(minDate)) return;
        if (maxDate && day > startOfDay(maxDate)) return;

        // If we already have a time selected (or default), use it
        const [hours, minutes] = selectedTime.split(":").map(Number);
        const newDate = showTime
            ? setMinutes(setHours(day, hours), minutes)
            : setMinutes(setHours(day, 0), 0);

        // Optimistic update
        setSelectedDate(newDate);
        onChange(newDate);
    };

    const handleTimeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const time = e.target.value;
        setSelectedTime(time);

        // If a date is selected, update it immediately with the new time
        if (selectedDate) {
            // Check strictly if time is valid HH:mm
            if (!time) return;

            const [hours, minutes] = time.split(":").map(Number);
            if (isNaN(hours) || isNaN(minutes)) return;

            const newDate = setMinutes(setHours(selectedDate, hours), minutes);
            // Optimistic update to prevent jitter? 
            // Actually, if we update parent, parent passes back 'value', useEffect runs...
            // setting selectedTime again to the SAME value shouldn't hurt.
            onChange(newDate);
        }
    };

    // Calendar generation
    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart);
    const endDate = endOfWeek(monthEnd);

    const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

    const weekDays = ["S", "M", "T", "W", "T", "F", "S"];

    const accentMap = {
        pink: {
            ring: "border-pink-500 ring-1 ring-pink-500/50",
            icon: "text-pink-400",
            selected: "bg-gradient-to-br from-pink-600 to-purple-600 text-white shadow-lg shadow-pink-900/20 hover:from-pink-500 hover:to-purple-500",
            today: "text-pink-400",
            dot: "bg-pink-500",
            timeBg: "bg-pink-500/10 text-pink-500",
            timeFocus: "focus:border-pink-500/50",
        },
        emerald: {
            ring: "border-emerald-400 ring-1 ring-emerald-400/50",
            icon: "text-emerald-300",
            selected: "bg-gradient-to-br from-emerald-500 to-sky-500 text-white shadow-lg shadow-emerald-900/20 hover:from-emerald-400 hover:to-sky-400",
            today: "text-emerald-300",
            dot: "bg-emerald-400",
            timeBg: "bg-emerald-400/10 text-emerald-300",
            timeFocus: "focus:border-emerald-400/50",
        },
        amber: {
            ring: "border-amber-400 ring-1 ring-amber-400/50",
            icon: "text-amber-300",
            selected: "bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-900/20 hover:from-amber-300 hover:to-orange-400",
            today: "text-amber-300",
            dot: "bg-amber-400",
            timeBg: "bg-amber-400/10 text-amber-300",
            timeFocus: "focus:border-amber-400/50",
        },
        sky: {
            ring: "border-sky-400 ring-1 ring-sky-400/50",
            icon: "text-sky-300",
            selected: "bg-gradient-to-br from-sky-500 to-cyan-500 text-white shadow-lg shadow-sky-900/20 hover:from-sky-400 hover:to-cyan-400",
            today: "text-sky-300",
            dot: "bg-sky-400",
            timeBg: "bg-sky-400/10 text-sky-300",
            timeFocus: "focus:border-sky-400/50",
        },
    } as const;

    const accentStyles = accentMap[accent];

    return (
        <div className="relative w-full" ref={containerRef}>
            <div
                onClick={toggleOpen}
                className={`
                    w-full flex items-center justify-between px-4 py-3 rounded-xl border cursor-pointer transition-all
                    ${isOpen ? `${accentStyles.ring} bg-[var(--background-elevated)]` : 'border-[var(--border)] bg-[var(--background-elevated)]/70 hover:bg-[var(--card-hover)]/70'}
                `}
            >
                <div className="flex items-center gap-3 text-zinc-300">
                    <CalendarIcon className={`w-4 h-4 ${value ? accentStyles.icon : 'text-[var(--text-dim)]'}`} />
                    <span className={value ? "text-white font-medium" : "text-[var(--text-dim)]"}>
                        {value ? format(value, showTime ? "PPP 'at' p" : "dd/MM/yyyy") : placeholder}
                    </span>
                </div>
            </div>

            {isOpen && (
                <div className="absolute top-full mt-2 left-0 z-50 w-full md:w-[320px] bg-[var(--background-elevated)] border border-[var(--border)] rounded-xl shadow-2xl shadow-black overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-[var(--border)] bg-[var(--card)]">
                        <button onClick={prevMonth} className="p-1 hover:bg-white/10 rounded-md text-[var(--text-muted)] hover:text-white transition-colors">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <span className="text-sm font-semibold text-white">
                            {format(currentMonth, "MMMM yyyy")}
                        </span>
                        <button onClick={nextMonth} className="p-1 hover:bg-white/10 rounded-md text-[var(--text-muted)] hover:text-white transition-colors">
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>

                    {/* Calendar Grid */}
                    <div className="p-4">
                        <div className="grid grid-cols-7 mb-2">
                            {weekDays.map(d => (
                                <div key={d} className="text-center text-xs font-medium text-zinc-600 py-1">
                                    {d}
                                </div>
                            ))}
                        </div>
                        <div className="grid grid-cols-7 gap-1">
                            {calendarDays.map((day, idx) => {
                                const isSelected = selectedDate ? isSameDay(day, selectedDate) : false;
                                const isCurrentMonth = isSameMonth(day, currentMonth);
                                const isTodayDate = isToday(day);
                                const isDisabled = (minDate && day < startOfDay(minDate)) || (maxDate && day > startOfDay(maxDate));

                                return (
                                    <button
                                        key={idx}
                                        onClick={() => handleDateClick(day)}
                                        className={`
                                            h-9 rounded-lg text-sm flex items-center justify-center transition-all relative
                                            ${!isCurrentMonth ? 'text-zinc-700' : 'text-[var(--text-muted)] hover:bg-white/5 hover:text-white'}
                                            ${isSelected ? accentStyles.selected : ''}
                                            ${isTodayDate && !isSelected ? `${accentStyles.today} font-semibold` : ''}
                                            ${isDisabled ? 'opacity-30 pointer-events-none' : ''}
                                        `}
                                    >
                                        {format(day, "d")}
                                        {isTodayDate && !isSelected && (
                                            <div className={`absolute bottom-1.5 w-1 h-1 rounded-full ${accentStyles.dot}`} />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Time Selector */}
                    {showTime && (
                        <div className="p-4 border-t border-[var(--border)] bg-[var(--card)]">
                            <div className="flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${accentStyles.timeBg}`}>
                                    <Clock className="w-4 h-4" />
                                </div>
                                <div className="flex-1">
                                    <label className="text-[10px] uppercase font-bold text-[var(--text-dim)] mb-1 block">Time</label>
                                    <input
                                        type="time"
                                        value={selectedTime}
                                        onChange={handleTimeChange}
                                        className={`w-full bg-black/40 border border-[var(--border)] rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none ${accentStyles.timeFocus}`}
                                    />
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
