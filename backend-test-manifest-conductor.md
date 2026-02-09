# Backend Test Manifest: The Conductor

## 1. Scheduling Engine (The Brain)

### Priority Calculator
- [ ] **Deadline Ranking**: Modules with closer deadlines rank higher.
- [ ] **Mastery Gap**: Subjects with <70% mastery rank higher.
- [ ] **Prerequisite Chain**: Module B blocked until Module A complete.

### Load Balancer
- [ ] **Age Cap (7-10)**: Max 4 hours/day total assigned.
- [ ] **Age Cap (14+)**: Max 6 hours/day total assigned.
- [ ] **Block Duration**: Grade 4 gets 25min blocks; Grade 10 gets 50min blocks.
- [ ] **Cognitive Mix**: Verify no more than 2 "Heavy" (Math/Science) blocks back-to-back.

## 2. Schedule Generator (The Builder)

### Weekly View
- [ ] **Full Week Gen**: Generates entries for Mon-Fri.
- [ ] **Calendar Respect**: No school assigned on marked holidays.
- [ ] **Consistency**: Fixed slots (e.g., "Math 9am") remain consistent if possible.

## 3. Adaptation & Overrides (The Real-Time Adjustment)

### Student Overrides
- [ ] **Swap Blocks**: REST API allows swapping Slots A and B.
- [ ] **Skip Day**: Marking "Sick Today" pushes all tasks to future dates + recalculates weekend work.
- [ ] **Force Replan**: Button press triggers full regeneration of future days.

### Extra-Curricular Mode
- [ ] **Time Window**: Assigns work ONLY within "After School" window (e.g., 4pm-6pm).
- [ ] **Reduced Load**: Only prioritizes "Core" subjects if time is tight.

## 4. API & Security

### Endpoints
- [ ] `GET /conductor/schedule`: Returns fully populated week view.
- [ ] `PUT /conductor/override`: Validates override type (swap/skip/hours).
- [ ] **Parent View**: Parent can see schedule but standard Student restrictions apply.
