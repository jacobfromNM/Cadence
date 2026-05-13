# Cadence — Data & Privacy Disclosure

**Last updated:** May 2026

**Developer:** Jacob Davis | jacobfromNM

**Contact:** jacobfromnm@gmail.com

---

By accessing or using Cadence, you acknowledge that you have read, understood, and agree to the terms described in this disclosure. If you do not agree, do not use this application.

---

## 1. What Cadence Is

Cadence is a school pickup coordination tool designed to help school staff manage student dismissal. It is an independently developed application, not affiliated with any school district, government body, or commercial education platform.

---

## 2. What Data We Collect

Cadence collects and stores only the minimum data necessary to operate the pickup coordination workflow:

- **School information:** School name and a school code chosen by the administrator
- **Staff credentials:** Numeric PINs used to authenticate staff and administrators
- **Classroom information:** Class codes and teacher names entered by school administrators
- **Student names:** First and last names of students, entered by school administrators
- **Pickup activity:** Timestamped records of pickup requests, student dismissals, and delivery confirmations during the school day
- **Absence records:** Students marked absent each day, cleared nightly

Cadence does **not** collect:

- Student ID numbers, grades, addresses, or demographic information
- Parent or guardian names, contact information, or identification
- Biometric data of any kind
- Payment information
- Device identifiers or location data
- Any information about students beyond their name and classroom assignment

---

## 3. How Data Is Stored

All data entered into Cadence is stored in a cloud database provided by **Supabase** (supabase.com), a third-party infrastructure provider. The database is hosted on servers in the United States.

Cadence is hosted on **Vercel** (vercel.com). All data transmission between your device and Cadence's servers is encrypted using HTTPS/TLS.

By using Cadence, you acknowledge and accept that your data is stored on these third-party platforms, each of which maintains their own privacy policies and security practices. You are encouraged to review:

- Supabase Privacy Policy: https://supabase.com/privacy
- Vercel Privacy Policy: https://vercel.com/legal/privacy-policy

---

## 4. How Data Is Used

Data entered into Cadence is used exclusively for the purpose of coordinating student pickup at your school. Specifically:

- Student names and classroom assignments are used to facilitate pickup requests between outdoor staff and classroom teachers
- Pickup activity records are used to track the status of each student during dismissal
- No data is used for advertising, marketing, analytics, or any purpose beyond the core pickup coordination function

---

## 5. Data Sharing

Cadence does **not** sell, rent, license, or otherwise share your data with any third parties for commercial purposes.

Data is accessible to:

- Staff and administrators at your school who hold valid login credentials
- The application developer (Jacob | jacobfromNM) for the purposes of maintaining and troubleshooting the application
- Supabase and Vercel, as infrastructure providers, to the extent required to operate their services

---

## 6. Data Retention

Pickup activity records and absence records are automatically deleted on a nightly basis as part of normal application operation. School, classroom, and student records persist until deleted by a school administrator through the application's School Setup screen.

School administrators are responsible for removing their school's data from Cadence if they discontinue use of the service. The developer provides a "Delete School" function in the admin panel for this purpose.

---

## 7. FERPA Notice

The Family Educational Rights and Privacy Act (FERPA) governs the privacy of student education records in the United States. Cadence stores student first and last names in connection with a school identifier, which may constitute education records under FERPA.

**School administrators and staff are responsible for ensuring their use of Cadence complies with FERPA and any applicable district, state, or local policies governing the use of third-party applications that handle student information.**

The developer of Cadence is an independent software developer, not a school official or educational institution, and does not independently assume FERPA obligations. Schools using Cadence for student data management do so at their own discretion and bear responsibility for ensuring appropriate authorization and compliance.

If your school district requires a Data Processing Agreement (DPA) or similar formal agreement before using third-party software with student data, please contact the developer before use.

---

## 8. Security

Cadence implements the following security measures:

- All data transmission is encrypted via HTTPS/TLS
- Access to school data requires a numeric PIN, stored as a bcrypt hash, known only to authorized staff
- Login attempts are rate-limited: after 5 consecutive failed attempts, the login form is locked for 30 seconds to prevent brute-force attacks
- Row Level Security is enabled on the database
- Daily automatic deletion of transient pickup and absence data

**Known limitations and risks the user should be aware of:**

- The application uses a shared PIN model rather than individual user accounts. This means activity cannot be attributed to a specific individual staff member.
- The application has not undergone a formal third-party security audit.

Cadence is provided as a best-effort tool by an independent developer. **No warranty is made regarding the security, availability, or integrity of the application or the data stored within it.**

Users are encouraged to use PINs that are not reused from other systems and to notify the developer immediately at jacobfromnm@gmail.com if they suspect unauthorized access to their school's data.

---

## 9. Children's Privacy

Cadence stores the first and last names of minors (students) as entered by school administrators. The developer does not knowingly collect any information directly from children. All student data is entered by school administrators acting in their professional capacity on behalf of their institution.

---

## 10. Disclaimer of Warranties

Cadence is provided **"as is"** and **"as available"** without warranty of any kind, express or implied, including but not limited to warranties of merchantability, fitness for a particular purpose, or non-infringement.

The developer does not warrant that:

- The application will be available at all times or free from errors
- Data stored in the application will be free from loss, corruption, or unauthorized access
- The application meets the compliance requirements of any specific school district, state, or jurisdiction

---

## 11. Limitation of Liability

To the fullest extent permitted by applicable law, the developer of Cadence (Jacob | jacobfromNM) shall not be liable for any direct, indirect, incidental, special, consequential, or exemplary damages arising from your use of or inability to use this application, including but not limited to:

- Loss or corruption of student or school data
- Unauthorized access to data stored in the application
- Failure of the application to perform its intended function during a school dismissal
- Any regulatory penalties, fines, or legal costs arising from a school's use of this application in a manner inconsistent with FERPA or other applicable law

By using Cadence, you expressly acknowledge that you assume full responsibility for any risks associated with its use, and that the developer's total liability to you for any claim arising from use of the application shall not exceed zero dollars ($0.00).

---

## 12. Indemnification

You agree to indemnify, defend, and hold harmless the developer of Cadence from and against any and all claims, damages, losses, liabilities, costs, and expenses (including reasonable attorneys' fees) arising from:

- Your use of Cadence
- Your violation of this disclosure
- Your school's failure to comply with FERPA or other applicable student data privacy laws
- Any claim by a student, parent, guardian, or school district arising from your use of Cadence

---

## 13. Changes to This Disclosure

The developer reserves the right to update this disclosure at any time. Continued use of Cadence following any update constitutes acceptance of the revised terms. The "Last updated" date at the top of this document reflects the most recent revision.

---

## 14. Contact

For questions, concerns, data deletion requests, or to report a security issue:

**Jacob Davis**

**Email:** jacobfromnm@gmail.com

For security disclosures specifically, please include "Cadence Security" in the subject line.

---

*Cadence is an independent project. It is not affiliated with, endorsed by, or a product of any school district, government agency, Supabase, or Vercel.*
