require('dotenv').config();
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const Section = require('../models/Section');
const Seat = require('../models/Seat');

const seed = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB');

  // Clear existing data
  await Promise.all([User.deleteMany(), Section.deleteMany(), Seat.deleteMany()]);

  // Create admin
  const admin = await User.create({
    name: 'Library Admin',
    email: 'admin@library.edu',
    password: 'Admin@1234',
    role: 'admin',
  });
  console.log('Admin created:', admin.email);

  // Create student
  const student = await User.create({
    name: 'Test Student',
    email: 'student@library.edu',
    password: 'Student@1234',
    role: 'student',
    studentId: 'STU001',
  });
  console.log('Student created:', student.email);

  // Create sections
  const sections = await Section.insertMany([
    { name: 'General Reading', description: 'Open reading area', floor: 1, amenities: ['wifi'] },
    { name: 'Silent Zone', description: 'Strictly no talking', floor: 2, amenities: ['wifi', 'power_outlet'] },
    { name: 'Group Study', description: 'Discussion allowed', floor: 1, amenities: ['wifi', 'whiteboard'] },
    { name: 'Computer Lab', description: 'Computer workstations', floor: 3, amenities: ['wifi', 'power_outlet', 'computer'] },
  ]);
  console.log('Sections created:', sections.map((s) => s.name).join(', '));

  // Create seats: 10 per section
  const seats = [];
  sections.forEach((section, si) => {
    for (let i = 1; i <= 10; i++) {
      seats.push({
        seatNumber: `${String.fromCharCode(65 + si)}${String(i).padStart(2, '0')}`,
        section: section._id,
        row: Math.ceil(i / 5),
        col: ((i - 1) % 5) + 1,
      });
    }
  });
  await Seat.insertMany(seats);
  console.log(`Created ${seats.length} seats`);

  console.log('\n--- Seed complete ---');
  console.log('Admin: admin@library.edu / Admin@1234');
  console.log('Student: student@library.edu / Student@1234');
  process.exit(0);
};

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
