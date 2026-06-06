import { createContext, useContext, useState } from 'react'

// ── Translations ─────────────────────────────────────────────
const translations = {
  en: {
    // Nav
    dashboard:    'Dashboard',
    properties:   'Properties',
    tenants:      'Tenants',
    payments:     'Payments',
    settings:     'Settings',
    signOut:      'Sign out',

    // Login
    loginTitle:   'Sign In',
    username:     'Username',
    password:     'Password',
    loginBtn:     'Sign In',
    loginHint:    'Access is by invitation only. Contact your administrator.',

    // Change Password
    setPassword:  'Set Your Password',
    newPassword:  'New Password',
    confirmPwd:   'Confirm Password',
    setPwdBtn:    'Set Password & Continue',

    // Dashboard
    goodMorning:  'Good morning',
    goodAfternoon:'Good afternoon',
    goodEvening:  'Good evening',
    totalProps:   'Properties',
    totalUnits:   'Total Units',
    occupied:     'Occupied',
    vacant:       'Vacant',
    monthlyRent:  'Monthly Rent',
    collected:    'Collected',
    outstanding:  'Outstanding',
    outstandingBalances: 'Outstanding Balances',
    recentPayments: 'Recent Payments',
    noPayments:   'No payments yet',
    allClear:     'All clear ✓',
    needsCollection: 'Needs collection',
    fromOccupied: 'from occupied units',

    // Properties
    addProperty:  '+ Add Property',
    noProperties: 'No properties yet',
    addFirstProp: 'Add your first property to get started.',
    propName:     'Property Name',
    propCode:     'Property Code',
    address:      'Address',
    city:         'City',
    district:     'District',
    country:      'Country',
    propType:     'Property Type',
    saveProperty: 'Save Property',
    deleteProperty: 'Delete',
    addUnit:      '+ Unit',
    editProperty: 'Edit Property',
    addPropertyTitle: 'Add Property',

    // Units
    unitNumber:   'Unit Number',
    floor:        'Floor',
    monthlyRentLKR: 'Monthly Rent (LKR)',
    electricity:  'Electricity Charges (LKR)',
    water:        'Water Charges (LKR)',
    deposit:      'Security Deposit (LKR)',
    description:  'Description',
    occupied_:    'Occupied',
    vacant_:      'Vacant',
    addUnit_:     'Add Unit',
    saveChanges:  'Save Changes',
    cancel:       'Cancel',

    // Tenants
    createTenant: '+ Create Tenant',
    noTenants:    'No tenants yet',
    tenant:       'Tenant',
    contact:      'Contact',
    nic:          'NIC',
    status:       'Status',
    unit:         'Unit',
    outstanding_: 'Outstanding',
    actions:      'Actions',
    assigned:     'Assigned',
    unassigned:   'Unassigned',
    inactive:     'Inactive',
    active:       'Active',
    edit:         'Edit',
    assignUnit:   'Assign Unit',
    endTenancy:   'End Tenancy',
    deactivate:   'Deactivate',
    activate:     'Activate',
    createTenantTitle: 'Create Tenant Account',
    editTenant:   'Edit Tenant',
    assignUnitTitle: 'Assign Unit to Tenant',
    fullName:     'Full Name',
    email:        'Email (optional)',
    phone:        'Phone',
    tempPassword: 'Temp Password',
    address_:     'Address',
    photo:        'Photo (optional)',
    emergencyContact: 'Emergency Contact (Optional)',
    contactName:  'Contact Name',
    contactPhone: 'Contact Phone',
    createTenantBtn: 'Create Tenant',
    selectUnit:   'Select Unit',
    startDate:    'Start Date',
    rentDueDay:   'Rent Due Day',
    securityDeposit: 'Security Deposit (LKR)',
    notes:        'Notes',
    totalMonthlyRent: 'Total Monthly Rent (LKR)',

    // Payments
    markPayment:  '+ Mark Payment',
    allPayments:  'All Payments',
    outstandingTab: 'Outstanding',
    allStatuses:  'All Statuses',
    allTenants:   'All Tenants',
    clearFilters: 'Clear Filters',
    confirmed:    '✓ Confirmed',
    pending:      '⏳ Pending',
    overdue:      'Overdue',
    period:       'Period',
    amount:       'Amount',
    method:       'Method',
    date:         'Date',
    confirm:      '✓ Confirm',
    receipt:      'Receipt',
    markAsConfirmed: '✓ Mark as Confirmed',
    property:     'Property',
    noRecords:    'No payment records',
    noOutstanding: 'No outstanding balances',
    awaitingConfirmation: 'awaiting confirmation',

    // Common
    save:         'Save',
    close:        'Close',
    view:         'View',
    suspend:      'Suspend',
    clear:        'Clear',
    search:       'Search',
    loading:      'Loading Ceylora...',
  },

  si: {
    // Nav
    dashboard:    'ඩැෂ්බෝඩ්',
    properties:   'දේපල',
    tenants:      'කුලී නිවැසියන්',
    payments:     'ගෙවීම්',
    settings:     'සැකසුම්',
    signOut:      'ඉවත් වන්න',

    // Login
    loginTitle:   'පිවිසෙන්න',
    username:     'පරිශීලක නාමය',
    password:     'මුරපදය',
    loginBtn:     'පිවිසෙන්න',
    loginHint:    'ප්‍රවේශය ආරාධනය මත පමණි. ඔබේ පරිපාලක අමතන්න.',

    // Change Password
    setPassword:  'ඔබේ මුරපදය සකසන්න',
    newPassword:  'නව මුරපදය',
    confirmPwd:   'මුරපදය තහවුරු කරන්න',
    setPwdBtn:    'මුරපදය සකසා ඉදිරියට යන්න',

    // Dashboard
    goodMorning:  'සුබ උදෑසනක්',
    goodAfternoon:'සුබ දහවලක්',
    goodEvening:  'සුබ සන්ධ්‍යාවක්',
    totalProps:   'දේපල',
    totalUnits:   'මුළු ඒකක',
    occupied:     'භාවිතයේ',
    vacant:       'හිස්',
    monthlyRent:  'මාසික කුලිය',
    collected:    'එකතු කළ',
    outstanding:  'හිඟ',
    outstandingBalances: 'හිඟ ශේෂ',
    recentPayments: 'මෑත ගෙවීම්',
    noPayments:   'තවම ගෙවීම් නැත',
    allClear:     'සියල්ල හරි ✓',
    needsCollection: 'එකතු කිරීම අවශ්‍යයි',
    fromOccupied: 'භාවිත ඒකක වලින්',

    // Properties
    addProperty:  '+ දේපලක් එක් කරන්න',
    noProperties: 'තවම දේපල නැත',
    addFirstProp: 'ආරම්භ කිරීමට ඔබේ පළමු දේපල එක් කරන්න.',
    propName:     'දේපල නාමය',
    propCode:     'දේපල කේතය',
    address:      'ලිපිනය',
    city:         'නගරය',
    district:     'දිස්ත්‍රික්කය',
    country:      'රට',
    propType:     'දේපල වර්ගය',
    saveProperty: 'දේපල සුරකින්න',
    deleteProperty: 'මකන්න',
    addUnit:      '+ ඒකකය',
    editProperty: 'දේපල සංස්කරණය',
    addPropertyTitle: 'දේපල එකතු කරන්න',

    // Units
    unitNumber:   'ඒකක අංකය',
    floor:        'මහල',
    monthlyRentLKR: 'මාසික කුලිය (රු.)',
    electricity:  'විදුලි ගාස්තු (රු.)',
    water:        'ජල ගාස්තු (රු.)',
    deposit:      'ආරක්ෂිත තැන්පතු (රු.)',
    description:  'විස්තරය',
    occupied_:    'භාවිතයේ',
    vacant_:      'හිස්',
    addUnit_:     'ඒකක එකතු කරන්න',
    saveChanges:  'වෙනස්කම් සුරකින්න',
    cancel:       'අවලංගු කරන්න',

    // Tenants
    createTenant: '+ කුලී නිවැසියෙකු සාදන්න',
    noTenants:    'තවම කුලී නිවැසියන් නැත',
    tenant:       'කුලී නිවැසියා',
    contact:      'සම්බන්ධතාව',
    nic:          'ජාතික හැඳුනුම්පත',
    status:       'තත්ත්වය',
    unit:         'ඒකකය',
    outstanding_: 'හිඟ',
    actions:      'ක්‍රියා',
    assigned:     'පවරා ඇත',
    unassigned:   'පවරා නැත',
    inactive:     'අක්‍රිය',
    active:       'ක්‍රියාකාරී',
    edit:         'සංස්කරණය',
    assignUnit:   'ඒකක පවරන්න',
    endTenancy:   'කුලී ගිවිසුම අවසන් කරන්න',
    deactivate:   'අක්‍රිය කරන්න',
    activate:     'සක්‍රිය කරන්න',
    createTenantTitle: 'කුලී නිවැසි ගිණුම සාදන්න',
    editTenant:   'කුලී නිවැසියා සංස්කරණය',
    assignUnitTitle: 'කුලී නිවැසියාට ඒකකය පවරන්න',
    fullName:     'සම්පූර්ණ නම',
    email:        'විද්‍යුත් තැපෑල (අත්‍යවශ්‍ය නොවේ)',
    phone:        'දුරකථන අංකය',
    tempPassword: 'තාවකාලික මුරපදය',
    address_:     'ලිපිනය',
    photo:        'ඡායාරූපය (අත්‍යවශ්‍ය නොවේ)',
    emergencyContact: 'හදිසි සම්බන්ධතාව (අත්‍යවශ්‍ය නොවේ)',
    contactName:  'සම්බන්ධතා නාමය',
    contactPhone: 'සම්බන්ධතා දුරකථනය',
    createTenantBtn: 'කුලී නිවැසියා සාදන්න',
    selectUnit:   'ඒකකය තෝරන්න',
    startDate:    'ආරම්භක දිනය',
    rentDueDay:   'කුලී ගෙවිය යුතු දිනය',
    securityDeposit: 'ආරක්ෂිත තැන්පතු (රු.)',
    notes:        'සටහන්',
    totalMonthlyRent: 'මුළු මාසික කුලිය (රු.)',

    // Payments
    markPayment:  '+ ගෙවීම සලකුණු කරන්න',
    allPayments:  'සියලු ගෙවීම්',
    outstandingTab: 'හිඟ',
    allStatuses:  'සියලු තත්ත්ව',
    allTenants:   'සියලු කුලී නිවැසියන්',
    clearFilters: 'පෙරීම් ඉවත් කරන්න',
    confirmed:    '✓ තහවුරු කළ',
    pending:      '⏳ අපේක්ෂිත',
    overdue:      'කල් ඉකුත්',
    period:       'කාලය',
    amount:       'මුදල',
    method:       'ක්‍රමය',
    date:         'දිනය',
    confirm:      '✓ තහවුරු කරන්න',
    receipt:      'රිසිට්පත',
    markAsConfirmed: '✓ තහවුරු කළ ලෙස සලකුණු කරන්න',
    property:     'දේපල',
    noRecords:    'ගෙවීම් වාර්තා නොමැත',
    noOutstanding: 'හිඟ ශේෂ නොමැත',
    awaitingConfirmation: 'තහවුරු කිරීම් අපේක්ෂිතයි',

    // Common
    save:         'සුරකින්න',
    close:        'වසන්න',
    view:         'බලන්න',
    suspend:      'අත්හිටුවන්න',
    clear:        'හිස් කරන්න',
    search:       'සොයන්න',
    loading:      'Ceylora පූරණය වෙමින්...',
  }
}

const LangContext = createContext({})

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('ceylora_lang') || 'en')

  function switchLang(l) {
    setLang(l)
    localStorage.setItem('ceylora_lang', l)
  }

  function t(key) {
    return translations[lang]?.[key] || translations['en']?.[key] || key
  }

  return (
    <LangContext.Provider value={{ lang, switchLang, t }}>
      {children}
    </LangContext.Provider>
  )
}

export const useLang = () => useContext(LangContext)
