"use client";

import React, { useState, useEffect, useRef } from "react";
import {
    format,
    addMonths,
    subMonths,
    startOfMonth,
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
}

export default function DateTimePicker({ value, onChange, placeholder = "Select date & time" }: DateTimePickerProps) {
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
        // If we already have a time selected (or default), use it
        const [hours, minutes] = selectedTime.split(":").map(Number);
        const newDate = setMinutes(setHours(day, hours), minutes);

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

    return (
        <div className="relative w-full" ref={containerRef}>
            <div
                onClick={toggleOpen}
                className={`
                    w-full flex items-center justify-between px-4 py-3 rounded-xl border cursor-pointer transition-all
                    ${isOpen ? 'border-pink-500 ring-1 ring-pink-500/50 bg-[#151515]' : 'border-white/10 bg-black/50 hover:bg-white/5'}
                `}
            >
                <div className="flex items-center gap-3 text-zinc-300">
                    <CalendarIcon className={`w-4 h-4 ${value ? 'text-pink-400' : 'text-zinc-500'}`} />
                    <span className={value ? "text-white font-medium" : "text-zinc-500"}>
                        {value ? format(value, "PPP 'at' p") : placeholder}
                    </span>
                </div>
            </div>

            {isOpen && (
                <div className="absolute top-full mt-2 left-0 z-50 w-full md:w-[320px] bg-[#111] border border-white/10 rounded-xl shadow-2xl shadow-black overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-white/5 bg-[#151515]">
                        <button onClick={prevMonth} className="p-1 hover:bg-white/10 rounded-md text-zinc-400 hover:text-white transition-colors">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <span className="text-sm font-semibold text-white">
                            {format(currentMonth, "MMMM yyyy")}
                        </span>
                        <button onClick={nextMonth} className="p-1 hover:bg-white/10 rounded-md text-zinc-400 hover:text-white transition-colors">
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

                                return (
                                    <button
                                        key={idx}
                                        onClick={() => handleDateClick(day)}
                                        className={`
                                            h-9 rounded-lg text-sm flex items-center justify-center transition-all relative
                                            ${!isCurrentMonth ? 'text-zinc-700' : 'text-zinc-300 hover:bg-white/5 hover:text-white'}
                                            ${isSelected ? 'bg-gradient-to-br from-pink-600 to-purple-600 text-white font-bold shadow-lg shadow-pink-900/20 hover:from-pink-500 hover:to-purple-500' : ''}
                                            ${isTodayDate && !isSelected ? 'text-pink-400 font-semibold' : ''}
                                        `}
                                    >
                                        {format(day, "d")}
                                        {isTodayDate && !isSelected && (
                                            <div className="absolute bottom-1.5 w-1 h-1 rounded-full bg-pink-500" />
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Time Selector */}
                    <div className="p-4 border-t border-white/5 bg-[#151515]">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-lg bg-pink-500/10 flex items-center justify-center text-pink-500">
                                <Clock className="w-4 h-4" />
                            </div>
                            <div className="flex-1">
                                <label className="text-[10px] uppercase font-bold text-zinc-500 mb-1 block">Time</label>
                                <input
                                    type="time"
                                    value={selectedTime}
                                    onChange={handleTimeChange}
                                    className="w-full bg-black/50 border border-white/10 rounded-lg px-2 py-1.5 text-sm text-white focus:outline-none focus:border-pink-500/50"
                                />
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
