const mongoose = require('mongoose');

// Custom Form Field Schema for Normal Events
const formFieldSchema = new mongoose.Schema({
fieldId: {
type: String,
required: true
},
fieldType: {
type: String,
enum: ['text', 'email', 'phone', 'number', 'date', 'select', 'checkbox', 'textarea'],
required: true
},
label: {
type: String,
required: true
},
placeholder: String,
required: {
type: Boolean,
default: false
},
options: [String], // For select/checkbox fields
validation: {
minLength: Number,
maxLength: Number,
pattern: String
}
}, { _id: false });

// Merchandise Variant Schema
const variantSchema = new mongoose.Schema({
variantId: {
type: String,
required: true
},
name: {
type: String,
required: true
},
size: String,
color: String,
price: {
type: Number,
required: true
},
stock: {
type: Number,
required: true,
default: 0
}
}, { _id: false });

const eventSchema = new mongoose.Schema({

// Basic Fields
name: {
type: String,
required: true
},

description: {
type: String,
required: true
},

type: {
type: String,
enum: ['Normal', 'Merchandise'],
required: true,
default: 'Normal'
},

organizer: {
type: mongoose.Schema.Types.ObjectId,
ref: 'Organizer',
required: true
},

// Dates
startDate: {
type: Date,
required: true
},

endDate: {
type: Date,
required: true
},

registrationStartDate: Date,

registrationDeadline: {
type: Date,
required: true
},

// Eligibility
eligibility: {
type: {
type: String,
enum: ['All', 'IIIT', 'Non-IIIT', 'Custom'],
default: 'All'
},
details: String, // For custom eligibility
minYear: Number,
maxYear: Number
},

// Fee and Limits
fee: {
type: Number,
default: 0
},

participantLimit: {
type: Number,
required: true
},

location: String,

category: String,

// Normal Event Specific Fields
customForm: {
type: [formFieldSchema],
required: function() { return this.type === 'Normal'; }
},

// Merchandise Event Specific Fields
merchandise: {
variants: [variantSchema],
totalStock: {
type: Number,
default: 0
},
purchaseLimit: {
type: Number,
default: 1
},
description: String
},

// Common Fields
maxTeamSize: {
type: Number,
default: 1
},

isTeamEvent: {
type: Boolean,
default: false
},

status: {
type: String,
enum: ['Draft', 'Published', 'Ongoing', 'Closed', 'Completed'],
default: 'Draft'
},

totalRegistrations: {
type: Number,
default: 0
},

poster: String, // Image URL

tags: [String]

}, { timestamps: true });

// Index for common queries
eventSchema.index({ organizer: 1, status: 1 });
eventSchema.index({ type: 1, status: 1 });
eventSchema.index({ registrationDeadline: 1 });

module.exports = mongoose.model('Event', eventSchema);
