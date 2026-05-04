// src/lib/mockData.js
//
// Seed data used when VITE_USE_MOCK_DATA=true.
// Mirrors the exact shape of the Supabase tables so swapping is seamless.

export const MOCK_SCHOOL = {
  id: 'mesa-elem',
  name: 'Mesa Elementary',
  code: 'MESA-ELEM',
  staff_pin_hash:  '1234',   // plain text for prototype; hashed in production
  admin_pin_hash:  '9999',
}

export const MOCK_CLASSES = [
  { id: 'kg-a', school_id: 'mesa-elem', code: 'KG-A', teacher_name: 'Mrs. Jones'  },
  { id: '1b',   school_id: 'mesa-elem', code: '1B',   teacher_name: 'Mr. Smith'   },
  { id: '2a',   school_id: 'mesa-elem', code: '2A',   teacher_name: 'Ms. Lee'     },
  { id: '3c',   school_id: 'mesa-elem', code: '3C',   teacher_name: 'Mrs. Brown'  },
  { id: '4a',   school_id: 'mesa-elem', code: '4A',   teacher_name: 'Mr. Davis'   },
  { id: '5b',   school_id: 'mesa-elem', code: '5B',   teacher_name: 'Ms. Kim'     },
]

export const MOCK_STUDENTS = [
  { id: 's1',  school_id: 'mesa-elem', class_id: 'kg-a', name: 'Lily Chen'         },
  { id: 's2',  school_id: 'mesa-elem', class_id: 'kg-a', name: 'Marco Reyes'       },
  { id: 's3',  school_id: 'mesa-elem', class_id: 'kg-a', name: 'Noah Williams'     },
  { id: 's4',  school_id: 'mesa-elem', class_id: '1b',   name: 'Ava Park'          },
  { id: 's5',  school_id: 'mesa-elem', class_id: '1b',   name: 'Ethan Moore'       },
  { id: 's6',  school_id: 'mesa-elem', class_id: '2a',   name: 'Sofia Gutierrez'   },
  { id: 's7',  school_id: 'mesa-elem', class_id: '2a',   name: 'Liam Johnson'      },
  { id: 's8',  school_id: 'mesa-elem', class_id: '3c',   name: 'Mia Thompson'      },
  { id: 's9',  school_id: 'mesa-elem', class_id: '3c',   name: 'James Wilson'      },
  { id: 's10', school_id: 'mesa-elem', class_id: '4a',   name: 'Emma Davis'        },
  { id: 's11', school_id: 'mesa-elem', class_id: '5b',   name: 'Oliver Garcia'     },
  { id: 's12', school_id: 'mesa-elem', class_id: '5b',   name: 'Isabella Martinez' },
]

// School credentials lookup — used by LoginScreen
export const SCHOOL_CREDENTIALS = {
  'MESA-ELEM': { staffPin: '1234', adminPin: '9999', school: MOCK_SCHOOL },
}
