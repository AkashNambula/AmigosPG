import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { UserPlus, Building2, AlertTriangle, HelpCircle } from 'lucide-react';
import Toast from '../components/Toast';
import API from '../services/api';

const INDIAN_STATES_CITIES = {
  "Andhra Pradesh": ["Anantapur", "Chittoor", "Eluru", "Guntur", "Kakinada", "Kurnool", "Nellore", "Ongole", "Rajahmundry", "Srikakulam", "Tadepalligudem", "Tirupati", "Vijayawada", "Visakhapatnam", "Vizianagaram"],
  "Arunachal Pradesh": ["Itanagar", "Naharlagun", "Pasighat", "Tawang"],
  "Assam": ["Guwahati", "Dibrugarh", "Silchar", "Jorhat", "Nagaon", "Tinsukia", "Tezpur"],
  "Bihar": ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Darbhanga", "Purnia", "Arrah", "Begusarai"],
  "Chhattisgarh": ["Raipur", "Bhilai", "Bilaspur", "Korba", "Rajnandgaon", "Jagdalpur"],
  "Goa": ["Panaji", "Margao", "Vasco da Gama", "Mapusa"],
  "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar", "Junagadh", "Gandhinagar", "Nadiad", "Morbi", "Anand"],
  "Haryana": ["Faridabad", "Gurugram", "Panipat", "Ambala", "Yamunanagar", "Rohtak", "Hisar", "Karnal", "Sonipat", "Panchkula"],
  "Himachal Pradesh": ["Shimla", "Dharamshala", "Solan", "Mandi", "Nahan", "Baddi"],
  "Jharkhand": ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro Steel City", "Deoghar", "Hazaribagh", "Giridih"],
  "Karnataka": ["Bengaluru", "Mysuru", "Hubballi-Dharwad", "Mangaluru", "Belagavi", "Davangere", "Ballari", "Tumakuru", "Shivamogga", "Vijayapura", "Kalaburagi"],
  "Kerala": ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Kollam", "Alappuzha", "Palakkad", "Kannur", "Kottayam"],
  "Madhya Pradesh": ["Indore", "Bhopal", "Jabalpur", "Gwalior", "Ujjain", "Sagar", "Dewas", "Satna", "Ratlam", "Rewa"],
  "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Thane", "Pimpri-Chinchwad", "Nashik", "Kalyan-Dombivli", "Vasai-Virar", "Aurangabad", "Navi Mumbai", "Solapur", "Mira-Bhayandar", "Amravati", "Kolhapur"],
  "Manipur": ["Imphal", "Thoubal", "Kakching"],
  "Meghalaya": ["Shillong", "Tura", "Jowai"],
  "Mizoram": ["Aizawl", "Lunglei", "Champhai"],
  "Nagaland": ["Dimapur", "Kohima", "Mokokchung"],
  "Odisha": ["Bhubaneswar", "Cuttack", "Rourkela", "Berhampur", "Sambalpur", "Puri", "Balasore"],
  "Punjab": ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda", "Mohali", "Pathankot", "Hoshiarpur"],
  "Rajasthan": ["Jaipur", "Jodhpur", "Kota", "Bikaner", "Ajmer", "Udaipur", "Bhilwara", "Alwar", "Sikar", "Bharatpur"],
  "Sikkim": ["Gangtok", "Namchi", "Geyzing"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tirunelveli", "Vellore", "Erode", "Thoothukudi", "Nagercoil", "Thanjavur"],
  "Telangana": ["Hyderabad", "Warangal", "Nizamabad", "Khammam", "Karimnagar", "Ramagundam", "Mahbubnagar", "Nalgonda", "Adilabad"],
  "Tripura": ["Agartala", "Dharmanagar", "Udaipur"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Ghaziabad", "Agra", "Meerut", "Varanasi", "Prayagraj", "Bareilly", "Aligarh", "Moradabad", "Saharanpur", "Noida", "Firozabad", "Jhansi", "Muzaffarnagar"],
  "Uttarakhand": ["Dehradun", "Haridwar", "Roorkee", "Haldwani", "Rudrapur", "Kashipur"],
  "West Bengal": ["Kolkata", "Howrah", "Darjeeling", "Siliguri", "Asansol", "Durgapur", "Kharagpur", "Bardhaman", "Malda", "Baharampur"],
  "Andaman and Nicobar Islands": ["Port Blair"],
  "Chandigarh": ["Chandigarh"],
  "Dadra and Nagar Haveli and Daman and Diu": ["Daman", "Diu", "Silvassa"],
  "Delhi": ["New Delhi", "Dwarka", "Rohini", "Saket", "Vasant Kunj", "Karol Bagh", "Connaught Place"],
  "Jammu and Kashmir": ["Srinagar", "Jammu", "Anantnag", "Baramulla"],
  "Ladakh": ["Leh", "Kargil"],
  "Lakshadweep": ["Kavaratti"],
  "Puducherry": ["Puducherry", "Karaikal", "Mahe", "Yanam"]
};

export default function Register() {
  const { tenantSlug } = useParams();
  const effectiveSlug = tenantSlug || 'amigospg';

  const [tenantInfo, setTenantInfo] = useState(null);
  const [tenantLoading, setTenantLoading] = useState(true);
  const [tenantError, setTenantError] = useState(null);

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    state: '',
    city: '',
    password: '',
    confirm_password: '',
    tenant_slug: effectiveSlug
  });

  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Fetch active tenant branding on mount
  useEffect(() => {
    setTenantLoading(true);
    setTenantError(null);

    API.get(`/public/tenants/${effectiveSlug}`)
      .then((res) => {
        setTenantInfo(res.data);
        setFormData(prev => ({ ...prev, tenant_slug: res.data.slug }));
      })
      .catch((err) => {
        setTenantError(err.friendlyMessage || 'PG Tenant property not found.');
      })
      .finally(() => {
        setTenantLoading(false);
      });
  }, [effectiveSlug]);

  // Autocomplete states
  const [stateSuggestions, setStateSuggestions] = useState([]);
  const [citySuggestions, setCitySuggestions] = useState([]);
  const [showStateSuggestions, setShowStateSuggestions] = useState(false);
  const [showCitySuggestions, setShowCitySuggestions] = useState(false);
  const [stateActiveIndex, setStateActiveIndex] = useState(-1);
  const [cityActiveIndex, setCityActiveIndex] = useState(-1);

  const stateRef = useRef(null);
  const cityRef = useRef(null);

  const { register } = useAuth();
  const navigate = useNavigate();

  // Handle click outside to close dropdowns
  useEffect(() => {
    function handleClickOutside(event) {
      if (stateRef.current && !stateRef.current.contains(event.target)) {
        setShowStateSuggestions(false);
      }
      if (cityRef.current && !cityRef.current.contains(event.target)) {
        setShowCitySuggestions(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  const validateField = (name, value) => {
    let err = '';
    const trimmed = value.trim();

    if (name === 'first_name') {
      if (!trimmed) {
        err = 'First name is required.';
      } else if (!/^[A-Za-z\s]+$/.test(trimmed)) {
        err = 'First name must contain only letters and spaces.';
      }
    } else if (name === 'last_name') {
      if (!trimmed) {
        err = 'Last name is required.';
      } else if (!/^[A-Za-z\s]+$/.test(trimmed)) {
        err = 'Last name must contain only letters and spaces.';
      }
    } else if (name === 'email') {
      if (!trimmed) {
        err = 'Email address is required.';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        err = 'Please enter a valid email address.';
      } else if (/\s/.test(value)) {
        err = 'Email address cannot contain spaces.';
      }
    } else if (name === 'phone') {
      if (!trimmed) {
        err = 'Phone number is required.';
      } else if (!/^[6-9]\d{9}$/.test(trimmed)) {
        err = 'Please enter a valid 10-digit mobile number.';
      }
    } else if (name === 'state') {
      if (!trimmed) {
        err = 'State is required.';
      } else if (!INDIAN_STATES_CITIES[trimmed]) {
        err = 'Please select a valid state.';
      }
    } else if (name === 'city') {
      if (!trimmed) {
        err = 'City is required.';
      } else {
        const selectedState = formData.state;
        const validCities = INDIAN_STATES_CITIES[selectedState] || [];
        if (!validCities.includes(trimmed)) {
          err = 'Please select a valid city.';
        }
      }
    } else if (name === 'password') {
      if (!trimmed) {
        err = 'Password is required.';
      } else if (value.length < 6) {
        err = 'Password must contain at least 6 characters.';
      }
    } else if (name === 'confirm_password') {
      if (!trimmed) {
        err = 'Confirm password is required.';
      } else if (value !== formData.password) {
        err = 'Passwords do not match.';
      }
    }

    setErrors(prev => ({ ...prev, [name]: err }));
    return !err;
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    if (name === 'first_name' || name === 'last_name') {
      const cleanValue = value.replace(/[^A-Za-z\s]/g, '');
      setFormData(prev => ({ ...prev, [name]: cleanValue }));
      if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
      return;
    }

    if (name === 'email') {
      const cleanValue = value.toLowerCase().replace(/\s/g, '');
      setFormData(prev => ({ ...prev, email: cleanValue }));
      if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
      return;
    }

    if (name === 'phone') {
      const cleanValue = value.replace(/\D/g, '').slice(0, 10);
      setFormData(prev => ({ ...prev, phone: cleanValue }));
      if (errors.phone) setErrors(prev => ({ ...prev, phone: '' }));
      return;
    }

    if (name === 'state') {
      const cleanValue = value.replace(/[^A-Za-z\s]/g, '');
      setFormData(prev => ({ ...prev, state: cleanValue, city: '' }));
      if (errors.state) setErrors(prev => ({ ...prev, state: '' }));
      if (errors.city) setErrors(prev => ({ ...prev, city: '' }));

      const query = cleanValue.toLowerCase().trim();
      const filtered = Object.keys(INDIAN_STATES_CITIES).filter(st =>
        st.toLowerCase().includes(query)
      );
      setStateSuggestions(filtered);
      setShowStateSuggestions(true);
      setStateActiveIndex(-1);
      return;
    }

    if (name === 'city') {
      const cleanValue = value.replace(/[^A-Za-z\s]/g, '');
      setFormData(prev => ({ ...prev, city: cleanValue }));
      if (errors.city) setErrors(prev => ({ ...prev, city: '' }));

      const query = cleanValue.toLowerCase().trim();
      const stateCities = INDIAN_STATES_CITIES[formData.state] || [];
      const filtered = stateCities.filter(ct =>
        ct.toLowerCase().includes(query)
      );
      setCitySuggestions(filtered);
      setShowCitySuggestions(true);
      setCityActiveIndex(-1);
      return;
    }

    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: '' }));
  };

  const handleBlur = (field) => {
    setTimeout(() => {
      validateField(field, formData[field]);
    }, 200);
  };

  const selectState = (st) => {
    setFormData(prev => ({ ...prev, state: st, city: '' }));
    setShowStateSuggestions(false);
    setErrors(prev => ({ ...prev, state: '', city: '' }));
  };

  const selectCity = (ct) => {
    setFormData(prev => ({ ...prev, city: ct }));
    setShowCitySuggestions(false);
    setErrors(prev => ({ ...prev, city: '' }));
  };

  const handleStateFocus = () => {
    const query = formData.state.toLowerCase().trim();
    const filtered = Object.keys(INDIAN_STATES_CITIES).filter(st =>
      st.toLowerCase().includes(query)
    );
    setStateSuggestions(filtered);
    setShowStateSuggestions(true);
    setStateActiveIndex(-1);
  };

  const handleCityFocus = () => {
    if (!formData.state.trim()) {
      setToast({ type: 'warning', message: 'Please select a state first.' });
      return;
    }
    const query = formData.city.toLowerCase().trim();
    const stateCities = INDIAN_STATES_CITIES[formData.state] || [];
    const filtered = stateCities.filter(ct =>
      ct.toLowerCase().includes(query)
    );
    setCitySuggestions(filtered);
    setShowCitySuggestions(true);
    setCityActiveIndex(-1);
  };

  const handleStateKeyDown = (e) => {
    if (!showStateSuggestions || stateSuggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setStateActiveIndex(prev => Math.min(prev + 1, stateSuggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setStateActiveIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (stateActiveIndex >= 0 && stateActiveIndex < stateSuggestions.length) {
        selectState(stateSuggestions[stateActiveIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowStateSuggestions(false);
    }
  };

  const handleCityKeyDown = (e) => {
    if (!showCitySuggestions || citySuggestions.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCityActiveIndex(prev => Math.min(prev + 1, citySuggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCityActiveIndex(prev => Math.max(prev - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (cityActiveIndex >= 0 && cityActiveIndex < citySuggestions.length) {
        selectCity(citySuggestions[cityActiveIndex]);
      }
    } else if (e.key === 'Escape') {
      setShowCitySuggestions(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (tenantInfo && !tenantInfo.is_active) {
      setToast({ type: 'error', message: 'This PG property is currently inactive. Registration disabled.' });
      return;
    }

    // Trigger validation across all fields
    let isValid = true;
    const requiredFields = ['first_name', 'last_name', 'email', 'phone', 'state', 'city', 'password', 'confirm_password'];
    requiredFields.forEach((field) => {
      const fieldValid = validateField(field, formData[field]);
      if (!fieldValid) isValid = false;
    });

    if (!isValid) {
      setToast({ type: 'error', message: 'Please fix all field errors before submitting.' });
      return;
    }

    setLoading(true);
    try {
      await register({ ...formData, tenant_slug: effectiveSlug });
      setToast({ type: 'success', message: 'Account created successfully! Redirecting to sign in...' });
      setTimeout(() => {
        navigate(`/login/${effectiveSlug}`);
      }, 1500);
    } catch (err) {
      setToast({ type: 'error', message: err || 'Registration failed. Please try again.' });
    } finally {
      setLoading(false);
    }
  };

  if (tenantLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  if (tenantError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full text-center bg-white p-8 rounded shadow-md border border-gray-200">
          <HelpCircle className="h-16 w-16 text-amber-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">PG Property Not Found</h2>
          <p className="text-sm text-gray-600 mb-6">
            The requested PG tenant property URL does not exist or has been removed.
          </p>
          <Link
            to="/register/amigospg"
            className="inline-block px-4 py-2 bg-black text-white rounded font-medium text-sm hover:bg-gray-800 transition-colors"
          >
            Go to AMIGOS PG Registration
          </Link>
        </div>
      </div>
    );
  }

  const logoSrc = tenantInfo?.logo_url ? `http://localhost:8000${tenantInfo.logo_url}` : null;

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-lg w-full space-y-8 bg-white p-8 rounded shadow-md border border-gray-200">
        
        {/* Header Branding */}
        <div className="text-center">
          {logoSrc ? (
            <img
              src={logoSrc}
              alt={tenantInfo?.name}
              className="h-20 w-auto mx-auto mb-4 object-contain"
            />
          ) : (
            <div className="w-16 h-16 bg-gray-900 text-white rounded-xl flex items-center justify-center mx-auto mb-4 shadow">
              <Building2 className="h-8 w-8" />
            </div>
          )}
          <h2 className="text-3xl font-bold tracking-tight text-gray-900 uppercase">
            CREATE ACCOUNT
          </h2>
          <p className="mt-2 text-sm text-gray-600 font-medium">
            Join {tenantInfo?.name || 'AMIGOS PG'}
          </p>
        </div>

        {/* Inactive Tenant Banner */}
        {tenantInfo && !tenantInfo.is_active && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3 text-red-800">
            <AlertTriangle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-bold mb-1">PG Property Inactive</p>
              <p>This PG tenant is currently inactive. Registration is disabled. Please contact administration.</p>
            </div>
          </div>
        )}

        {/* Registration Form */}
        <form className="mt-8 space-y-4" onSubmit={handleSubmit}>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="first_name" className="block text-sm font-medium text-gray-700">
                First Name
              </label>
              <input
                id="first_name"
                name="first_name"
                type="text"
                required
                disabled={tenantInfo && !tenantInfo.is_active}
                value={formData.first_name}
                onChange={handleInputChange}
                onBlur={() => handleBlur('first_name')}
                className={`mt-1 block w-full px-3 py-2 border rounded shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm ${
                  errors.first_name ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'
                } disabled:bg-gray-100 disabled:cursor-not-allowed`}
              />
              {errors.first_name && <p className="text-red-500 text-[10px] mt-1 font-semibold">{errors.first_name}</p>}
            </div>
            <div>
              <label htmlFor="last_name" className="block text-sm font-medium text-gray-700">
                Last Name
              </label>
              <input
                id="last_name"
                name="last_name"
                type="text"
                required
                disabled={tenantInfo && !tenantInfo.is_active}
                value={formData.last_name}
                onChange={handleInputChange}
                onBlur={() => handleBlur('last_name')}
                className={`mt-1 block w-full px-3 py-2 border rounded shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm ${
                  errors.last_name ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'
                } disabled:bg-gray-100 disabled:cursor-not-allowed`}
              />
              {errors.last_name && <p className="text-red-500 text-[10px] mt-1 font-semibold">{errors.last_name}</p>}
            </div>
          </div>

          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700">
              Email Address
            </label>
            <input
              id="email"
              name="email"
              type="text"
              required
              disabled={tenantInfo && !tenantInfo.is_active}
              value={formData.email}
              onChange={handleInputChange}
              onBlur={() => handleBlur('email')}
              className={`mt-1 block w-full px-3 py-2 border rounded shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm ${
                errors.email ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'
              } disabled:bg-gray-100 disabled:cursor-not-allowed`}
              placeholder="name@example.com"
            />
            {errors.email && <p className="text-red-500 text-[10px] mt-1 font-semibold">{errors.email}</p>}
          </div>

          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700">
              Phone Number
            </label>
            <input
              id="phone"
              name="phone"
              type="text"
              required
              maxLength={10}
              disabled={tenantInfo && !tenantInfo.is_active}
              value={formData.phone}
              onChange={handleInputChange}
              onBlur={() => handleBlur('phone')}
              className={`mt-1 block w-full px-3 py-2 border rounded shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm ${
                errors.phone ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'
              } disabled:bg-gray-100 disabled:cursor-not-allowed`}
              placeholder="e.g. 9876543210"
            />
            {errors.phone && <p className="text-red-500 text-[10px] mt-1 font-semibold">{errors.phone}</p>}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="relative" ref={stateRef}>
              <label htmlFor="state" className="block text-sm font-medium text-gray-700">
                State
              </label>
              <input
                id="state"
                name="state"
                type="text"
                required
                autoComplete="off"
                disabled={tenantInfo && !tenantInfo.is_active}
                value={formData.state}
                onChange={handleInputChange}
                onFocus={handleStateFocus}
                onBlur={() => handleBlur('state')}
                onKeyDown={handleStateKeyDown}
                className={`mt-1 block w-full px-3 py-2 border rounded shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm ${
                  errors.state ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'
                } disabled:bg-gray-100 disabled:cursor-not-allowed`}
                placeholder="e.g. Karnataka"
              />
              {errors.state && <p className="text-red-500 text-[10px] mt-1 font-semibold">{errors.state}</p>}

              {showStateSuggestions && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg max-h-48 overflow-y-auto z-50 divide-y divide-gray-50">
                  {stateSuggestions.length === 0 ? (
                    <div className="p-3 text-xs text-gray-500 italic">No matching state found</div>
                  ) : (
                    stateSuggestions.map((st, idx) => (
                      <div
                        key={st}
                        onClick={() => selectState(st)}
                        onMouseEnter={() => setStateActiveIndex(idx)}
                        className={`p-2.5 text-xs text-gray-900 cursor-pointer transition-colors ${
                          stateActiveIndex === idx ? 'bg-black text-white font-semibold' : 'hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        {st}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>

            <div className="relative" ref={cityRef}>
              <label htmlFor="city" className="block text-sm font-medium text-gray-700">
                City
              </label>
              <input
                id="city"
                name="city"
                type="text"
                required
                autoComplete="off"
                disabled={tenantInfo && !tenantInfo.is_active}
                value={formData.city}
                onChange={handleInputChange}
                onFocus={handleCityFocus}
                onBlur={() => handleBlur('city')}
                onKeyDown={handleCityKeyDown}
                className={`mt-1 block w-full px-3 py-2 border rounded shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm ${
                  errors.city ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'
                } disabled:bg-gray-100 disabled:cursor-not-allowed`}
                placeholder="e.g. Bengaluru"
              />
              {errors.city && <p className="text-red-500 text-[10px] mt-1 font-semibold">{errors.city}</p>}

              {showCitySuggestions && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-gray-200 rounded shadow-lg max-h-48 overflow-y-auto z-50 divide-y divide-gray-50">
                  {citySuggestions.length === 0 ? (
                    <div className="p-3 text-xs text-gray-500 italic">No matching city found</div>
                  ) : (
                    citySuggestions.map((ct, idx) => (
                      <div
                        key={ct}
                        onClick={() => selectCity(ct)}
                        onMouseEnter={() => setCityActiveIndex(idx)}
                        className={`p-2.5 text-xs text-gray-900 cursor-pointer transition-colors ${
                          cityActiveIndex === idx ? 'bg-black text-white font-semibold' : 'hover:bg-gray-100 text-gray-700'
                        }`}
                      >
                        {ct}
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                disabled={tenantInfo && !tenantInfo.is_active}
                value={formData.password}
                onChange={handleInputChange}
                onBlur={() => handleBlur('password')}
                className={`mt-1 block w-full px-3 py-2 border rounded shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm ${
                  errors.password ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'
                } disabled:bg-gray-100 disabled:cursor-not-allowed`}
                placeholder="Min 6 characters"
              />
              {errors.password && <p className="text-red-500 text-[10px] mt-1 font-semibold">{errors.password}</p>}
            </div>
            <div>
              <label htmlFor="confirm_password" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <input
                id="confirm_password"
                name="confirm_password"
                type="password"
                required
                disabled={tenantInfo && !tenantInfo.is_active}
                value={formData.confirm_password}
                onChange={handleInputChange}
                onBlur={() => handleBlur('confirm_password')}
                className={`mt-1 block w-full px-3 py-2 border rounded shadow-sm focus:outline-none focus:ring-black focus:border-black sm:text-sm ${
                  errors.confirm_password ? 'border-red-500 ring-1 ring-red-500' : 'border-gray-300'
                } disabled:bg-gray-100 disabled:cursor-not-allowed`}
              />
              {errors.confirm_password && <p className="text-red-500 text-[10px] mt-1 font-semibold">{errors.confirm_password}</p>}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={loading || (tenantInfo && !tenantInfo.is_active)}
              className="group relative w-full flex justify-center py-2.5 px-4 border border-transparent text-sm font-medium rounded text-white bg-black hover:bg-gray-900 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-black disabled:opacity-50 transition-colors"
            >
              <span className="absolute left-0 inset-y-0 flex items-center pl-3">
                <UserPlus className="h-5 w-5 text-gray-400 group-hover:text-gray-300" aria-hidden="true" />
              </span>
              {loading ? 'Registering...' : 'Register'}
            </button>
          </div>
        </form>

        <div className="text-center mt-4">
          <p className="text-sm text-gray-600">
            Already have an account?{' '}
            <Link to={`/login/${effectiveSlug}`} className="font-medium text-black hover:underline">
              Sign In Here
            </Link>
          </p>
        </div>
      </div>

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
