import React, { useState, useEffect } from 'react';
import { MdContactSupport, MdHistory, MdFilterList } from "react-icons/md";
import { IoClose, IoTimeOutline, IoCheckmarkCircle, IoPlayCircle, IoChevronDown } from "react-icons/io5";
import { FiCalendar, FiMessageCircle } from "react-icons/fi";
import axios from 'axios';
import toast from 'react-hot-toast';
import { axiosInstance } from '@/lib/axiosInstance';

const FloatingButtons = () => {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isHistoryOpen, setIsHistoryOpen] = useState(false);
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [tickets, setTickets] = useState([]);
    const [filteredTickets, setFilteredTickets] = useState([]);
    const [loading, setLoading] = useState(false);
    const [submitting, setSubmitting] = useState(false);

    // Filter states
    const [filters, setFilters] = useState({
        timeRange: 'all', // all, today, week, month
        sortBy: 'latest', // latest, oldest
        status: 'all' // all, open, in-progress, resolved
    });
    const [showFilters, setShowFilters] = useState(false);

    // Configure axios defaults
    axios.defaults.withCredentials = true;

    const handleKeyDown = (e) => {
        if (e.key === 'Escape') {
            setIsModalOpen(false);
            setIsHistoryOpen(false);
        }
    };

    useEffect(() => {
        if (isModalOpen || isHistoryOpen) {
            window.addEventListener('keydown', handleKeyDown);
        } else {
            window.removeEventListener('keydown', handleKeyDown);
        }

        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isModalOpen, isHistoryOpen]);

    // Fetch tickets when history modal opens
    useEffect(() => {
        if (isHistoryOpen) {
            fetchTickets();
        }
    }, [isHistoryOpen]);

    // Apply filters whenever tickets or filters change
    useEffect(() => {
        applyFilters();
    }, [tickets, filters]);

    const fetchTickets = async () => {
        setLoading(true);
        try {
            const response = await axiosInstance.get('/ticket/client/fetchTicket');
            setTickets(response.data.tickets || []);
        } catch (error) {
            console.error('Error fetching tickets:', error);
            toast.error('Failed to fetch tickets.');
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let filtered = [...tickets];

        // Time range filter
        if (filters.timeRange !== 'all') {
            const now = new Date();
            const filterDate = new Date();

            switch (filters.timeRange) {
                case 'today':
                    filterDate.setHours(0, 0, 0, 0);
                    break;
                case 'week':
                    filterDate.setDate(now.getDate() - 7);
                    break;
                case 'month':
                    filterDate.setMonth(now.getMonth() - 1);
                    break;
            }

            filtered = filtered.filter(ticket =>
                new Date(ticket.raisedAt) >= filterDate
            );
        }

        // Status filter
        if (filters.status !== 'all') {
            filtered = filtered.filter(ticket =>
                ticket.status.toLowerCase() === filters.status
            );
        }

        // Sort
        filtered.sort((a, b) => {
            const dateA = new Date(a.raisedAt);
            const dateB = new Date(b.raisedAt);
            return filters.sortBy === 'latest' ? dateB - dateA : dateA - dateB;
        });

        setFilteredTickets(filtered);
    };

    const handleFilterChange = (filterType, value) => {
        setFilters(prev => ({
            ...prev,
            [filterType]: value
        }));
    };

    const resetFilters = () => {
        setFilters({
            timeRange: 'all',
            sortBy: 'latest',
            status: 'all'
        });
    };

    const getActiveFiltersCount = () => {
        let count = 0;
        if (filters.timeRange !== 'all') count++;
        if (filters.sortBy !== 'latest') count++;
        if (filters.status !== 'all') count++;
        return count;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSubmitting(true);

        try {
            await axiosInstance.post('/ticket/client/raiseTicket', {
                title,
                msg: message
            });

            // Reset form and close modal
            setTitle('');
            setMessage('');
            setIsModalOpen(false);

            // Show success message
            toast.success('Ticket raised successfully!');
        } catch (error) {
            console.error('Error raising ticket:', error);
            toast.error('Failed to raise ticket. Please try again.');
        } finally {
            setSubmitting(false);
        }
    };

    const getStatusIcon = (status) => {
        switch (status.toLowerCase()) {
            case 'open':
                return <IoTimeOutline className="w-4 h-4 text-orange-500" />;
            case 'in-progress':
                return <IoPlayCircle className="w-4 h-4 text-blue-500" />;
            case 'resolved':
                return <IoCheckmarkCircle className="w-4 h-4 text-green-500" />;
            default:
                return <IoTimeOutline className="w-4 h-4 text-gray-500" />;
        }
    };

    const getStatusColor = (status) => {
        switch (status.toLowerCase()) {
            case 'open':
                return 'bg-orange-100 text-orange-800 border-orange-200';
            case 'in-progress':
                return 'bg-blue-100 text-blue-800 border-blue-200';
            case 'resolved':
                return 'bg-green-100 text-green-800 border-green-200';
            default:
                return 'bg-gray-100 text-gray-800 border-gray-200';
        }
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const TicketCard = ({ ticket }) => (
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between mb-3">
                <h3 className="font-semibold text-gray-900 flex-1 pr-2">{ticket.title}</h3>
                <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(ticket.status)}`}>
                    {getStatusIcon(ticket.status)}
                    {ticket.status}
                </div>
            </div>

            <p className="text-gray-600 text-sm mb-3 line-clamp-2">{ticket.msg}</p>

            <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                <div className="flex items-center gap-1">
                    <FiCalendar className="w-3 h-3" />
                    <span>{formatDate(ticket.raisedAt)}</span>
                </div>
            </div>
        </div>
    );

    const FilterDropdown = ({ label, value, options, onChange, icon }) => (
        <div className="relative">
            <button
                className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm hover:bg-gray-50 transition-colors min-w-[120px] justify-between"
                onClick={() => { }}
            >
                {icon}
                <span className="text-gray-700">{options.find(opt => opt.value === value)?.label || label}</span>
                <IoChevronDown className="w-4 h-4 text-gray-400" />
            </button>
            <select
                value={value}
                onChange={(e) => onChange(e.target.value)}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            >
                {options.map(option => (
                    <option key={option.value} value={option.value}>
                        {option.label}
                    </option>
                ))}
            </select>
        </div>
    );

    return (
        <>
            <div className="fixed bottom-4 left-16 flex-col items-end space-y-3 z-50">
                <button
                    className="flex items-center justify-center bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white font-medium px-4 py-2 h-10 rounded-full shadow-lg hover:shadow-xl transition-all duration-200 transform hover:scale-105 cursor-pointer"
                    onClick={() => setIsModalOpen(true)}
                >
                    <MdContactSupport className="w-4 h-4 mr-2" />
                    Raise Ticket
                </button>
            </div>

            {/* Raise Ticket Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-md relative shadow-2xl">
                        <button
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                            onClick={() => setIsModalOpen(false)}
                        >
                            <IoClose className="w-6 h-6" />
                        </button>

                        <div className="flex items-center gap-3 mb-6">
                            <div className="w-10 h-10 bg-red-100 rounded-full flex items-center justify-center">
                                <MdContactSupport className="w-5 h-5 text-red-600" />
                            </div>
                            <h2 className="text-xl font-semibold text-gray-900">Raise Support Ticket</h2>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Title</label>
                                <input
                                    type="text"
                                    value={title}
                                    onChange={(e) => setTitle(e.target.value)}
                                    required
                                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                                    placeholder="Brief description of the issue"
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-2">Message</label>
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    required
                                    rows="4"
                                    className="w-full border border-gray-300 text-black rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all resize-none"
                                    placeholder="Detailed description of the issue..."
                                />
                            </div>

                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={() => setIsHistoryOpen(true)}
                                    className="flex-1 flex items-center justify-center gap-2 bg-gray-100 text-gray-700 py-2 rounded-lg hover:bg-gray-200 transition-colors cursor-pointer"
                                >
                                    <MdHistory className="w-4 h-4" />
                                    View History
                                </button>
                                <button
                                    type="submit"
                                    disabled={submitting}
                                    className="flex-1 bg-gradient-to-r from-red-600 to-red-700 text-white py-2 rounded-lg hover:from-red-700 hover:to-red-800 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                                >
                                    {submitting ? 'Submitting...' : 'Submit Ticket'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* History Modal */}
            {isHistoryOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[85vh] relative shadow-2xl overflow-hidden">
                        <div className="flex items-center justify-between p-6 border-b border-gray-200">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                                    <MdHistory className="w-5 h-5 text-blue-600" />
                                </div>
                                <h2 className="text-xl font-semibold text-gray-900">Ticket History</h2>
                            </div>
                            <button
                                className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
                                onClick={() => setIsHistoryOpen(false)}
                            >
                                <IoClose className="w-6 h-6" />
                            </button>
                        </div>

                        {/* Filter Section */}
                        <div className="border-b border-gray-200 bg-gray-50">
                            <div className="flex items-center justify-between p-4">
                                <button
                                    onClick={() => setShowFilters(!showFilters)}
                                    className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                                >
                                    <MdFilterList className="w-4 h-4" />
                                    Filters
                                    {getActiveFiltersCount() > 0 && (
                                        <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
                                            {getActiveFiltersCount()}
                                        </span>
                                    )}
                                </button>
                                {getActiveFiltersCount() > 0 && (
                                    <button
                                        onClick={resetFilters}
                                        className="text-sm text-blue-600 hover:text-blue-800 transition-colors"
                                    >
                                        Clear All
                                    </button>
                                )}
                            </div>

                            {showFilters && (
                                <div className="px-4 pb-4">
                                    <div className="flex flex-wrap gap-3">
                                        <FilterDropdown
                                            label="Time Range"
                                            value={filters.timeRange}
                                            options={[
                                                { value: 'all', label: 'All Time' },
                                                { value: 'today', label: 'Today' },
                                                { value: 'week', label: 'This Week' },
                                                { value: 'month', label: 'This Month' }
                                            ]}
                                            onChange={(value) => handleFilterChange('timeRange', value)}
                                            icon={<FiCalendar className="w-4 h-4 text-gray-500" />}
                                        />

                                        <FilterDropdown
                                            label="Sort By"
                                            value={filters.sortBy}
                                            options={[
                                                { value: 'latest', label: 'Latest First' },
                                                { value: 'oldest', label: 'Oldest First' }
                                            ]}
                                            onChange={(value) => handleFilterChange('sortBy', value)}
                                            icon={<IoTimeOutline className="w-4 h-4 text-gray-500" />}
                                        />

                                        <FilterDropdown
                                            label="Status"
                                            value={filters.status}
                                            options={[
                                                { value: 'all', label: 'All Status' },
                                                { value: 'open', label: 'Open' },
                                                { value: 'in-progress', label: 'In Progress' },
                                                { value: 'resolved', label: 'Resolved' }
                                            ]}
                                            onChange={(value) => handleFilterChange('status', value)}
                                            icon={getStatusIcon(filters.status === 'all' ? 'open' : filters.status)}
                                        />
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="p-6 overflow-y-auto max-h-96">
                            {loading ? (
                                <div className="flex items-center justify-center py-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {filteredTickets.length > 0 ? (
                                        filteredTickets.map((ticket) => (
                                            <TicketCard key={ticket._id} ticket={ticket} />
                                        ))
                                    ) : (
                                        <div className="text-center py-8 text-gray-500">
                                            <FiMessageCircle className="w-12 h-12 mx-auto mb-3 text-gray-300" />
                                            <p>
                                                {getActiveFiltersCount() > 0
                                                    ? 'No tickets match your current filters.'
                                                    : 'No tickets raised by you yet.'
                                                }
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default FloatingButtons;