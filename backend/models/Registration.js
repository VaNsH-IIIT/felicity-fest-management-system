const mongoose = require('mongoose');

// Merchandise Purchase Item Schema
const purchaseItemSchema = new mongoose.Schema({
variantId: String,
variantName: String,
quantity: {
type: Number,
required: true,
default: 1
},
pricePerUnit: Number,
totalPrice: Number
}, { _id: false });

const registrationSchema = new mongoose.Schema({

// Participant-Event Mapping
event: {
type: mongoose.Schema.Types.ObjectId,
ref: 'Event',
required: true
},

participant: {
type: mongoose.Schema.Types.ObjectId,
ref: 'Participant',
required: true
},

team: {
type: mongoose.Schema.Types.ObjectId,
ref: 'Team'
},

// Status Fields
status: {
type: String,
enum: ['Registered', 'Confirmed', 'Cancelled', 'Completed', 'PendingApproval', 'Rejected'],
default: 'Registered'
},

// Payment Info
payment: {
status: {
type: String,
enum: ['Pending', 'Completed', 'Failed', 'Refunded', 'PendingApproval', 'Rejected'],
default: 'Pending'
},
amount: {
type: Number,
default: 0
},
transactionId: String,
paymentDate: Date,
paymentMethod: {
type: String,
enum: ['Cash', 'Online', 'Card', 'UPI']
},
proofImage: String,
approvalDate: Date,
rejectionReason: String
},

// Ticket ID
ticketId: {
type: String,
unique: true,
sparse: true
},

// Custom Form Responses (for Normal events)
formResponses: {
type: Map,
of: mongoose.Schema.Types.Mixed
},

// Merchandise Purchase Details (for Merchandise events)
merchandisePurchase: {
items: [purchaseItemSchema],
totalAmount: Number,
purchaseDate: Date,
deliveryStatus: {
type: String,
enum: ['Pending', 'Shipped', 'Delivered'],
default: 'Pending'
},
deliveryAddress: String,
deliveryPhone: String
},

// Additional Fields
checkedIn: {
type: Boolean,
default: false
},

checkInTime: Date,

notes: String,

referralCode: String

}, { timestamps: true });

// Index for common queries
registrationSchema.index({ event: 1, participant: 1 }, { unique: true });
registrationSchema.index({ 'payment.status': 1 });
registrationSchema.index({ event: 1, status: 1 });

// Generate Ticket ID before saving
registrationSchema.pre('save', async function() {
if (!this.ticketId) {
const count = await mongoose.model('Registration').countDocuments();
this.ticketId = `TKT-${this.event}-${Date.now()}-${count}`;
}
});

module.exports = mongoose.model('Registration', registrationSchema);
