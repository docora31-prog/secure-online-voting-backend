const mongoose = require('mongoose');
const dotenv = require('dotenv');
const assert = require('assert'); const expect = (val) => ({ to: { equal: (expected) => assert.strictEqual(val, expected), be: { true: () => assert.strictEqual(val, true), false: () => assert.strictEqual(val, false), null: () => assert.strictEqual(val, null) }, a: (type) => assert.strictEqual(typeof val, type), include: (str) => assert.ok(val.includes(str)) }, and: { not: { empty: assert.ok(val && val.length > 0) } } });
dotenv.config();

const ResultService = require('./services/ResultService');
const VotingService = require('./services/VotingService');
const Election = require('./models/Election');
const Candidate = require('./models/Candidate');
const Vote = require('./models/Vote');
const User = require('./models/User');
const AuditLog = require('./models/AuditLog');
const crypto = require('crypto');

// Helpers for test data
const createMockUser = async (role = 'voter', idSuffix = '1') => {
  return await User.create({
    fullName: `Test ${role} ${idSuffix}`,
    email: `test${role}${idSuffix}_${Date.now()}@example.com`,
    password: 'password123',
    nationalId: `ID${Date.now()}${idSuffix}${Math.floor(Math.random()*1000)}`,
    role,
    status: 'verified',
    isFlagged: false,
    faceEncodings: [0.1, 0.2]
  });
};

const createMockElection = async (status = 'completed') => {
  return await Election.create({
    title: `Test Election ${Date.now()}`,
    description: 'A test election',
    type: 'presidential',
    startDate: new Date(Date.now() - 100000),
    endDate: new Date(Date.now() - 10000),
    status,
    createdBy: new mongoose.Types.ObjectId()
  });
};

const createMockCandidate = async (electionId, name) => {
  return await Candidate.create({
    electionId,
    name,
    party: 'Test Party',
    age: 40,
    bio: 'Test bio'
  });
};

const runTests = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/secure-voting');
    console.log('Connected to DB for testing.');

    // Clear test collections or use a separate DB. We will just clean up the data we create.
    const cleanupIds = { users: [], elections: [], candidates: [], votes: [], auditLogs: [] };

    // --- TEST 1: Winner Calculation & Multiple Candidates ---
    console.log('\\n[TEST 1] Winner Calculation & Multiple Candidates');
    const e1 = await createMockElection('completed');
    cleanupIds.elections.push(e1._id);
    const c1 = await createMockCandidate(e1._id, 'Alice');
    const c2 = await createMockCandidate(e1._id, 'Bob');
    cleanupIds.candidates.push(c1._id, c2._id);
    
    // Add votes directly for speed (simulating valid votes)
    const u1 = await createMockUser('voter', 'u1');
    const u2 = await createMockUser('voter', 'u2');
    const u3 = await createMockUser('voter', 'u3');
    cleanupIds.users.push(u1._id, u2._id, u3._id);

    const v1 = await Vote.create({ electionId: e1._id, candidateId: c1._id, userId: u1._id, ipAddress: '127.0.0.1' });
    const v2 = await Vote.create({ electionId: e1._id, candidateId: c1._id, userId: u2._id, ipAddress: '127.0.0.1' });
    const v3 = await Vote.create({ electionId: e1._id, candidateId: c2._id, userId: u3._id, ipAddress: '127.0.0.1' });
    cleanupIds.votes.push(v1._id, v2._id, v3._id);

    const res1 = await ResultService.calculateElectionResults(e1._id);
    assert.strictEqual(res1.winner.candidateId.toString(), c1._id.toString());
    assert.strictEqual(res1.winner.voteCount, 2);
    assert.strictEqual(res1.isTie, false);
    assert.strictEqual(res1.statistics.totalVotesCast, 3);
    console.log('✔ Passed');

    // --- TEST 2: Tie Election ---
    console.log('\\n[TEST 2] Tie Election');
    const e2 = await createMockElection('completed');
    cleanupIds.elections.push(e2._id);
    const c3 = await createMockCandidate(e2._id, 'Charlie');
    const c4 = await createMockCandidate(e2._id, 'David');
    cleanupIds.candidates.push(c3._id, c4._id);
    
    const u4 = await createMockUser('voter', 'u4');
    const u5 = await createMockUser('voter', 'u5');
    cleanupIds.users.push(u4._id, u5._id);

    const v4 = await Vote.create({ electionId: e2._id, candidateId: c3._id, userId: u4._id, ipAddress: '127.0.0.1' });
    const v5 = await Vote.create({ electionId: e2._id, candidateId: c4._id, userId: u5._id, ipAddress: '127.0.0.1' });
    cleanupIds.votes.push(v4._id, v5._id);

    const res2 = await ResultService.calculateElectionResults(e2._id);
    assert.strictEqual(res2.isTie, true);
    assert.strictEqual(res2.winner, null);
    console.log('✔ Passed');

    // --- TEST 3: Zero Votes ---
    console.log('\\n[TEST 3] Zero Votes');
    const e3 = await createMockElection('completed');
    cleanupIds.elections.push(e3._id);
    const c5 = await createMockCandidate(e3._id, 'Eve');
    cleanupIds.candidates.push(c5._id);
    
    const res3 = await ResultService.calculateElectionResults(e3._id);
    assert.strictEqual(res3.winner, null);
    assert.strictEqual(res3.isTie, false);
    assert.strictEqual(res3.statistics.totalVotesCast, 0);
    console.log('✔ Passed');

    // --- TEST 4: Single Candidate ---
    console.log('\\n[TEST 4] Single Candidate');
    const e4 = await createMockElection('completed');
    cleanupIds.elections.push(e4._id);
    const c6 = await createMockCandidate(e4._id, 'Frank');
    cleanupIds.candidates.push(c6._id);
    
    const u6 = await createMockUser('voter', 'u6');
    cleanupIds.users.push(u6._id);

    const v6 = await Vote.create({ electionId: e4._id, candidateId: c6._id, userId: u6._id, ipAddress: '127.0.0.1' });
    cleanupIds.votes.push(v6._id);

    const res4 = await ResultService.calculateElectionResults(e4._id);
    assert.strictEqual(res4.winner.candidateId.toString(), c6._id.toString());
    assert.strictEqual(res4.winner.percentage, '100.00');
    console.log('✔ Passed');

    // --- TEST 5: Unauthorized Results Access (Ongoing Election) ---
    console.log('\\n[TEST 5] Unauthorized Results Access (Before Completion)');
    const e5 = await createMockElection('ongoing');
    cleanupIds.elections.push(e5._id);
    
    try {
      await ResultService.calculateElectionResults(e5._id);
      throw new Error('Should have failed');
    } catch (err) {
      assert.ok(err.message.includes('only available for completed elections'));
      console.log('✔ Passed');
    }

    // --- TEST 6: Duplicate Vote Prevention ---
    console.log('\\n[TEST 6] Duplicate Vote Prevention');
    const e6 = await createMockElection('ongoing');
    cleanupIds.elections.push(e6._id);
    const c7 = await createMockCandidate(e6._id, 'Grace');
    cleanupIds.candidates.push(c7._id);
    const u7 = await createMockUser('voter', 'u7');
    cleanupIds.users.push(u7._id);

    const receipt = await VotingService.castVote({
      userId: u7._id,
      electionId: e6._id,
      candidateId: c7._id,
      ipAddress: '127.0.0.1'
    });
    cleanupIds.votes.push(receipt.voteId);
    
    try {
      await VotingService.castVote({
        userId: u7._id,
        electionId: e6._id,
        candidateId: c7._id,
        ipAddress: '127.0.0.1'
      });
      throw new Error('Should have failed duplicate');
    } catch (err) {
      assert.ok(err.message.includes('already voted'));
      console.log('✔ Passed');
    }

    // --- TEST 7: Receipt Generation & Validation ---
    console.log('\\n[TEST 7] Receipt Generation');
    assert.strictEqual(typeof receipt.receiptId, 'string'); assert.ok(receipt.receiptId.length > 0);
    assert.strictEqual(receipt.candidateName, 'Grace');
    console.log('✔ Passed');
    
    // --- TEST 8: Vote History ---
    console.log('\\n[TEST 8] Vote History');
    const history = await VotingService.getUserVotingHistory(u7._id);
    assert.strictEqual(history.length, 1);
    assert.strictEqual(history[0].candidateId.name, 'Grace');
    console.log('✔ Passed');

    // --- CLEANUP ---
    console.log('\\nCleaning up test data...');
    await User.deleteMany({ _id: { $in: cleanupIds.users } });
    await Election.deleteMany({ _id: { $in: cleanupIds.elections } });
    await Candidate.deleteMany({ _id: { $in: cleanupIds.candidates } });
    await Vote.deleteMany({ _id: { $in: cleanupIds.votes } });
    
    console.log('\\nALL TESTS PASSED SUCCESSFULLY! 🚀');
    process.exit(0);
  } catch (error) {
    console.error('\\n❌ TEST FAILED:', error);
    process.exit(1);
  }
};

runTests();
