const mongoose = require('mongoose');
const dotenv = require('dotenv');
const ResultService = require('./services/ResultService');
const Election = require('./models/Election');
const Candidate = require('./models/Candidate');
const Vote = require('./models/Vote');
const User = require('./models/User');

dotenv.config();

async function runTests() {
  console.log('Connecting to database...');
  await mongoose.connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });
  console.log('Database connected.');

  // Create mock data
  const adminId = new mongoose.Types.ObjectId();
  const electionId = new mongoose.Types.ObjectId();
  const c1Id = new mongoose.Types.ObjectId();
  const c2Id = new mongoose.Types.ObjectId();
  
  try {
    console.log('\n--- Setting up Mock Data ---');
    await Election.create({
      _id: electionId,
      title: 'Test Election',
      type: 'National',
      startDate: new Date(Date.now() - 10000),
      endDate: new Date(Date.now() + 10000),
      status: 'completed',
      createdBy: adminId
    });

    await Candidate.insertMany([
      { _id: c1Id, electionId, name: 'Alice', party: 'Party A' },
      { _id: c2Id, electionId, name: 'Bob', party: 'Party B' }
    ]);
    
    // Test 1: Zero Votes
    console.log('\n[Test 1] Zero Votes Scenario');
    let res = await ResultService.calculateElectionResults(electionId);
    if (res.candidates.length === 2 && res.totalVotesCast === 0 && res.winner === null) {
      console.log('✅ Test 1 Passed: Handled zero votes correctly.');
    } else {
      console.error('❌ Test 1 Failed', res);
    }

    // Test 2: Normal Winner
    console.log('\n[Test 2] Normal Winner Scenario');
    await Vote.insertMany([
      { electionId, candidateId: c1Id, userId: new mongoose.Types.ObjectId() },
      { electionId, candidateId: c1Id, userId: new mongoose.Types.ObjectId() },
      { electionId, candidateId: c2Id, userId: new mongoose.Types.ObjectId() }
    ]);
    res = await ResultService.calculateElectionResults(electionId);
    if (res.winner.name === 'Alice' && res.isTie === false) {
      console.log('✅ Test 2 Passed: Alice correctly won.');
    } else {
      console.error('❌ Test 2 Failed', res);
    }

    // Test 3: Tie Scenario
    console.log('\n[Test 3] Tie Scenario');
    await Vote.create({ electionId, candidateId: c2Id, userId: new mongoose.Types.ObjectId() });
    res = await ResultService.calculateElectionResults(electionId);
    if (res.isTie === true && res.winner === null) {
      console.log('✅ Test 3 Passed: Tie successfully detected.');
    } else {
      console.error('❌ Test 3 Failed', res);
    }

    // Test 4: Access Control (Ongoing Election)
    console.log('\n[Test 4] Access Control - Ongoing Election');
    await Election.findByIdAndUpdate(electionId, { status: 'ongoing' });
    try {
      await ResultService.calculateElectionResults(electionId);
      console.error('❌ Test 4 Failed: Expected error was not thrown.');
    } catch (err) {
      if (err.message.includes('completed elections')) {
        console.log('✅ Test 4 Passed: Prevented result generation for ongoing election.');
      } else {
        console.error('❌ Test 4 Failed', err);
      }
    }

  } catch (error) {
    console.error('Test execution failed:', error);
  } finally {
    // Cleanup
    console.log('\nCleaning up mock data...');
    await Election.findByIdAndDelete(electionId);
    await Candidate.deleteMany({ electionId });
    await Vote.deleteMany({ electionId });
    await mongoose.disconnect();
    console.log('Done.');
  }
}

runTests();
