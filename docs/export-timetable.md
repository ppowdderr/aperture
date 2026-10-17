# Exporting timetable slots

The Course Timetable Browser is behind Edinburgh SSO. This project deliberately
does not store login cookies or browser profiles.

1. Sign in at <https://browser.ted.is.ed.ac.uk/>.
2. Open the programme's multi-course timetable, for example:

   `https://browser.ted.is.ed.ac.uk/generate/?courses%5B%5D=INFR10086_SV1_SEM2&period=YR`

   Add every `courses[]` occurrence from the DRPS timetable links, then choose
   the full academic year.
3. Use Chrome's **File → Save Page As → Web Page, HTML Only** and save the
   rendered page somewhere outside the repository.
4. Export the slots:

   ```sh
   npm run export:timetable -- UTCMPSI --input /tmp/aperture-timetable.html
   ```

The parser keeps only courses present in `data/courses-UTCMPSI.json`. It emits
full-class events and group alternatives, including day, start/end time,
teaching weeks, room and campus. Group labels preserve the CTB option (for
example `s01`), which is required to choose one alternative per group.

CTB is provisional: it does not confirm enrolment, group capacity or the
personal allocation shown in Timetabler.
