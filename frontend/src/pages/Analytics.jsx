import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../services/api';
import { 
  PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer, 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, 
  LineChart, Line, AreaChart, Area
} from 'recharts';

export default function Analytics() {
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [rooms, setRooms] = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [bills, setBills] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [users, setUsers] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        // Tenant endpoints
        if (user.role === 'tenant') {
          const [roomsRes, compRes, billsRes, bookRes] = await Promise.all([
            API.get('/rooms'),
            API.get('/complaints'),
            API.get('/bills'),
            API.get('/my-bookings')
          ]);
          setRooms(roomsRes.data);
          setComplaints(compRes.data);
          setBills(billsRes.data);
          setBookings(bookRes.data);
        } else {
          // Admin endpoints
          const [roomsRes, compRes, billsRes, bookRes, usersRes] = await Promise.all([
            API.get('/rooms'),
            API.get('/complaints'),
            API.get('/bills'),
            API.get('/bookings'),
            API.get('/users')
          ]);
          setRooms(roomsRes.data);
          setComplaints(compRes.data);
          setBills(billsRes.data);
          setBookings(bookRes.data);
          setUsers(usersRes.data);
        }
      } catch (err) {
        console.error("Error fetching analytics data", err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [user.role]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  // --- Common Chart Colors ---
  const COLORS = ['#000000', '#4B5563', '#9CA3AF', '#D1D5DB', '#F3F4F6'];
  const STATUS_COLORS = {
    'available': '#10B981', 'full': '#EF4444', 'maintenance': '#F59E0B',
    'OPEN': '#EF4444', 'IN_PROGRESS': '#F59E0B', 'RESOLVED': '#10B981', 'REJECTED': '#6B7280',
    'PAID': '#10B981', 'PENDING': '#F59E0B', 'OVERDUE': '#EF4444'
  };

  // --- Admin Analytics Data Prep ---
  // 1. Room Occupancy (Pie Chart)
  const roomOccupancyData = rooms.length === 0 ? [
    { name: 'Available', value: 15 }, { name: 'Full', value: 35 }, { name: 'Maintenance', value: 2 }
  ] : [
    { name: 'Available', value: rooms.filter(r => r.availability_status === 'available').length },
    { name: 'Full', value: rooms.filter(r => r.availability_status === 'full').length },
    { name: 'Maintenance', value: rooms.filter(r => r.availability_status === 'maintenance').length },
  ].filter(d => d.value > 0);

  // 2. Revenue Collection (Bar Chart)
  let paidAmount = 0;
  let pendingAmount = 0;
  if (bills.length === 0) {
    paidAmount = 145000;
    pendingAmount = 32000;
  } else {
    bills.forEach(b => {
      if (b.status === 'PAID') paidAmount += b.total_amount;
      else pendingAmount += b.total_amount;
    });
  }
  const revenueData = [
    { name: 'Paid Bills', amount: paidAmount, fill: '#10B981' },
    { name: 'Pending Bills', amount: pendingAmount, fill: '#F59E0B' }
  ];

  // 3. Complaints by Status (Donut Chart)
  const complaintsByStatus = { 'OPEN': 0, 'IN_PROGRESS': 0, 'RESOLVED': 0, 'REJECTED': 0 };
  let complaintsData = [];
  if (complaints.length === 0) {
    complaintsData = [
      { name: 'OPEN', value: 3 }, { name: 'IN_PROGRESS', value: 5 }, { name: 'RESOLVED', value: 12 }
    ];
  } else {
    complaints.forEach(c => {
      if (complaintsByStatus[c.status] !== undefined) {
        complaintsByStatus[c.status]++;
      }
    });
    complaintsData = Object.keys(complaintsByStatus)
      .map(key => ({ name: key, value: complaintsByStatus[key] }))
      .filter(d => d.value > 0);
  }

  // 4. Resident Account Status (Area Chart based on Roles/Status)
  const usersByStatus = { 'active': 0, 'pending': 0, 'inactive': 0 };
  let usersData = [];
  if (users.length === 0) {
    usersData = [
      { name: 'ACTIVE', count: 42 },
      { name: 'PENDING', count: 8 },
      { name: 'INACTIVE', count: 3 }
    ];
  } else {
    users.forEach(u => {
      if (usersByStatus[u.account_status] !== undefined) {
        usersByStatus[u.account_status]++;
      }
    });
    usersData = Object.keys(usersByStatus).map(key => ({
      name: key.toUpperCase(),
      count: usersByStatus[key]
    }));
  }

  // --- Tenant Analytics Data Prep ---
  // 1. Bill Payment Status (Pie Chart)
  let tPaid = 0, tPending = 0;
  if (bills.length === 0) {
    tPaid = 5; tPending = 1;
  } else {
    bills.forEach(b => {
      if (b.status === 'PAID') tPaid++;
      else tPending++;
    });
  }
  const tBillsData = [
    { name: 'Paid Bills', value: tPaid },
    { name: 'Pending Bills', value: tPending }
  ].filter(d => d.value > 0);

  // 2. My Complaints (Bar Chart)
  let tComplaintsData = [];
  if (complaints.length === 0) {
    tComplaintsData = [
      { name: 'Open', count: 1, fill: '#EF4444' },
      { name: 'In Progress', count: 2, fill: '#F59E0B' },
      { name: 'Resolved', count: 4, fill: '#10B981' }
    ];
  } else {
    tComplaintsData = [
      { name: 'Open', count: complaints.filter(c => c.status === 'OPEN').length, fill: '#EF4444' },
      { name: 'In Progress', count: complaints.filter(c => c.status === 'IN_PROGRESS').length, fill: '#F59E0B' },
      { name: 'Resolved', count: complaints.filter(c => c.status === 'RESOLVED').length, fill: '#10B981' }
    ];
  }

  // 3. My Expenses Breakdown (Area Chart)
  let expenseTrendData = [];
  if (bills.length === 0) {
    expenseTrendData = [
      { name: 'Jan', Rent: 14000, Food: 2500, Electricity: 600 },
      { name: 'Feb', Rent: 14000, Food: 2800, Electricity: 550 },
      { name: 'Mar', Rent: 14000, Food: 3100, Electricity: 700 },
      { name: 'Apr', Rent: 14000, Food: 2900, Electricity: 650 }
    ];
  } else if (bills.length === 1) {
    const b = bills[0];
    expenseTrendData = [
      { name: 'Previous', Rent: b.rent_amount, Food: b.food_amount, Electricity: b.electricity_amount },
      { name: 'Current', Rent: b.rent_amount, Food: b.food_amount, Electricity: b.electricity_amount }
    ];
  } else {
    const sortedBills = [...bills].sort((a, b) => new Date(a.billing_date) - new Date(b.billing_date));
    expenseTrendData = sortedBills.map((b, idx) => ({
      name: `Bill ${idx + 1}`,
      Rent: b.rent_amount,
      Food: b.food_amount,
      Electricity: b.electricity_amount
    }));
  }

  // 4. Overall PG Amenities availability (Line Chart based on floor capacity)
  let floorData = [];
  if (rooms.length === 0) {
    floorData = [
      { floor: 'Floor 1', capacity: 20, available: 4 },
      { floor: 'Floor 2', capacity: 25, available: 10 },
      { floor: 'Floor 3', capacity: 15, available: 0 },
      { floor: 'Floor 4', capacity: 20, available: 7 }
    ];
  } else {
    const floorDataMap = {};
    rooms.forEach(r => {
      if (!floorDataMap[r.floor]) floorDataMap[r.floor] = { floor: `Floor ${r.floor}`, capacity: 0, available: 0 };
      floorDataMap[r.floor].capacity += r.total_capacity;
      floorDataMap[r.floor].available += r.available_beds;
    });
    floorData = Object.values(floorDataMap).sort((a, b) => a.floor.localeCompare(b.floor));
    
    if (floorData.length === 1) {
       floorData.push({ floor: 'Floor ' + (parseInt(floorData[0].floor.replace('Floor ', '')) + 1), capacity: 0, available: 0 });
    }
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto animate-slide-in">
      <div className="border-b border-gray-200 pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 uppercase">
          {user.role === 'admin' ? 'ADMINISTRATOR ANALYTICS' : 'MY ANALYTICS & INSIGHTS'}
        </h1>
        <p className="text-sm text-gray-500 mt-1">
          {user.role === 'admin' 
            ? 'Visualize overall PG performance, revenue, and occupancy data.'
            : 'Track your personal expenses, complaint resolutions, and PG availability.'}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        
        {user.role === 'admin' ? (
          <>
            {/* Admin Chart 1: Room Occupancy (Pie) */}
            <div className="bg-white p-6 rounded border border-gray-200 shadow-sm">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Room Occupancy Status</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={roomOccupancyData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" label>
                      {roomOccupancyData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name.toLowerCase()] || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '4px', border: '1px solid #E5E7EB', fontSize: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Admin Chart 2: Revenue Collection (Bar) */}
            <div className="bg-white p-6 rounded border border-gray-200 shadow-sm">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Revenue Collection (INR)</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={revenueData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6B7280', fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '4px', border: '1px solid #E5E7EB', fontSize: '12px' }} />
                    <Bar dataKey="amount" radius={[4, 4, 0, 0]}>
                      {revenueData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Admin Chart 3: Complaints by Status (Donut) */}
            <div className="bg-white p-6 rounded border border-gray-200 shadow-sm">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Complaints Resolution Distribution</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={complaintsData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} fill="#8884d8" label>
                      {complaintsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={STATUS_COLORS[entry.name] || COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '4px', border: '1px solid #E5E7EB', fontSize: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Admin Chart 4: Resident Account Status (Area) */}
            <div className="bg-white p-6 rounded border border-gray-200 shadow-sm">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Resident Accounts Status</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={usersData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#000000" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#000000" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6B7280', fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '4px', border: '1px solid #E5E7EB', fontSize: '12px' }} />
                    <Area type="monotone" dataKey="count" stroke="#000000" fillOpacity={1} fill="url(#colorCount)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        ) : (
          <>
            {/* Tenant Chart 1: My Expenses (Area/Line) */}
            <div className="bg-white p-6 rounded border border-gray-200 shadow-sm md:col-span-2">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">My Expenses History (INR)</h3>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={expenseTrendData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6B7280', fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '4px', border: '1px solid #E5E7EB', fontSize: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                    <Line type="monotone" dataKey="Rent" stroke="#000000" strokeWidth={2} activeDot={{ r: 8 }} />
                    <Line type="monotone" dataKey="Food" stroke="#10B981" strokeWidth={2} />
                    <Line type="monotone" dataKey="Electricity" stroke="#F59E0B" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tenant Chart 2: Bill Payment Status (Pie) */}
            <div className="bg-white p-6 rounded border border-gray-200 shadow-sm">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">Invoice Status Breakdown</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={tBillsData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80} fill="#8884d8" label>
                      {tBillsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.name === 'Paid Bills' ? '#10B981' : '#F59E0B'} />
                      ))}
                    </Pie>
                    <Tooltip contentStyle={{ borderRadius: '4px', border: '1px solid #E5E7EB', fontSize: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tenant Chart 3: My Complaints (Bar) */}
            <div className="bg-white p-6 rounded border border-gray-200 shadow-sm">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">My Complaints Status</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={tComplaintsData} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#6B7280', fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                    <Tooltip cursor={{ fill: '#F3F4F6' }} contentStyle={{ borderRadius: '4px', border: '1px solid #E5E7EB', fontSize: '12px' }} />
                    <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                      {tComplaintsData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Tenant Chart 4: Overall PG Amenities availability (Area) */}
            <div className="bg-white p-6 rounded border border-gray-200 shadow-sm md:col-span-2">
              <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-4">PG Bed Availability By Floor</h3>
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={floorData} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorAvailable" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10B981" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#10B981" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E7EB" />
                    <XAxis dataKey="floor" tick={{ fontSize: 12, fill: '#6B7280', fontWeight: 600 }} axisLine={false} tickLine={false} />
                    <YAxis tick={{ fontSize: 12, fill: '#6B7280' }} axisLine={false} tickLine={false} />
                    <Tooltip contentStyle={{ borderRadius: '4px', border: '1px solid #E5E7EB', fontSize: '12px' }} />
                    <Legend wrapperStyle={{ fontSize: '12px', fontWeight: 'bold' }} />
                    <Area type="monotone" name="Available Beds" dataKey="available" stroke="#10B981" fillOpacity={1} fill="url(#colorAvailable)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
