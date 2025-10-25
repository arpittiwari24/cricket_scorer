"use client"

import React, { useState, useEffect } from 'react';
import { Users, Plus, Trash2, Edit2, Play, Trophy, RotateCcw, Save, Star } from 'lucide-react';

// Avatar generator - 8 different cartoon styles
const getAvatar = (index) => {
  const avatars = [
    '🧑‍🦰', '👨‍🦱', '👩‍🦳', '🧔', '👨‍🦲', '👩‍🦰', '🧑‍🦱', '👨‍🦳',
    '👩', '🧑', '👨', '👴', '👵', '🧓', '👦', '👧'
  ];
  return avatars[index % avatars.length];
};

const CricketScorer = () => {
  const [screen, setScreen] = useState('home');
  const [teams, setTeams] = useState([]);
  const [editingTeam, setEditingTeam] = useState(null);
  const [matchConfig, setMatchConfig] = useState({ overs: 5 });
  const [match, setMatch] = useState(null);
  const [selectedTeam1, setSelectedTeam1] = useState('');
  const [selectedTeam2, setSelectedTeam2] = useState('');
  const [overs, setOvers] = useState(5);

  // Load data from storage
  useEffect(() => {
    loadTeams();
  }, []);

  const loadTeams = () => {
    try {
      const stored = localStorage.getItem('cricket_teams');
      if (stored) {
        setTeams(JSON.parse(stored));
      }
    } catch (error) {
      console.log('No existing teams found');
    }
  };

  const saveTeams = (updatedTeams) => {
    try {
      localStorage.setItem('cricket_teams', JSON.stringify(updatedTeams));
      setTeams(updatedTeams);
    } catch (error) {
      console.error('Failed to save teams:', error);
    }
  };

  const addTeam = () => {
    const newTeam = {
      id: Date.now().toString(),
      name: '',
      players: []
    };
    setEditingTeam(newTeam);
    setScreen('editTeam');
  };

  const saveTeam = () => {
    if (!editingTeam.name.trim()) {
      alert('Please enter team name');
      return;
    }
    if (editingTeam.players.length < 2) {
      alert('Add at least 2 players');
      return;
    }
    const hasCaptain = editingTeam.players.some(p => p.isCaptain);
    if (!hasCaptain) {
      alert('Please select a captain');
      return;
    }

    const updatedTeams = teams.filter(t => t.id !== editingTeam.id);
    updatedTeams.push(editingTeam);
    saveTeams(updatedTeams);
    setEditingTeam(null);
    setScreen('home');
  };

  const deleteTeam = (teamId) => {
    if (confirm('Delete this team?')) {
      saveTeams(teams.filter(t => t.id !== teamId));
    }
  };

  const addPlayer = () => {
    if (editingTeam.players.length >= 11) {
      alert('Maximum 11 players allowed');
      return;
    }
    const newPlayer = {
      id: Date.now().toString(),
      name: '',
      isCaptain: false,
      avatarIndex: editingTeam.players.length
    };
    setEditingTeam({
      ...editingTeam,
      players: [...editingTeam.players, newPlayer]
    });
  };

  const updatePlayer = (playerId, field, value) => {
    setEditingTeam({
      ...editingTeam,
      players: editingTeam.players.map(p => {
        if (p.id === playerId) {
          if (field === 'isCaptain' && value) {
            return { ...p, [field]: value };
          }
          return { ...p, [field]: value };
        }
        if (field === 'isCaptain' && value) {
          return { ...p, isCaptain: false };
        }
        return p;
      })
    });
  };

  const deletePlayer = (playerId) => {
    setEditingTeam({
      ...editingTeam,
      players: editingTeam.players.filter(p => p.id !== playerId)
    });
  };

  const startMatch = () => {
    if (teams.length < 2) {
      alert('Create 2 teams first');
      return;
    }
    setScreen('selectTeams');
  };

  const initializeMatch = (team1Id, team2Id, overs) => {
    const team1 = teams.find(t => t.id === team1Id);
    const team2 = teams.find(t => t.id === team2Id);

    const newMatch = {
      team1: { ...team1, score: 0, wickets: 0, overs: 0, balls: 0 },
      team2: { ...team2, score: 0, wickets: 0, overs: 0, balls: 0 },
      totalOvers: overs,
      currentInnings: 1,
      battingTeam: team1Id,
      bowlingTeam: team2Id,
      currentBatsmen: [
        { ...team1.players[0], runs: 0, balls: 0, onStrike: true },
        { ...team1.players[1], runs: 0, balls: 0, onStrike: false }
      ],
      currentBowler: { ...team2.players[0], overs: 0, balls: 0, runs: 0, wickets: 0 },
      ballHistory: [],
      innings1BallHistory: [],
      innings2BallHistory: [],
      target: null,
      winner: null
    };

    setMatch(newMatch);
    setScreen('scoring');
  };

  const addRuns = (runs) => {
    if (!match || match.winner) return;

    const newMatch = { ...match };
    const battingTeam = newMatch.currentInnings === 1 ? newMatch.team1 : newMatch.team2;
    const striker = newMatch.currentBatsmen.find(b => b.onStrike);
    
    // Check if only one batsman remains
    const activeBatsmen = newMatch.currentBatsmen.filter(b => b.id);
    const singleBatsman = activeBatsmen.length === 1;
    
    // If single batsman, don't allow odd runs
    if (singleBatsman && runs % 2 === 1) {
      return;
    }

    striker.runs += runs;
    striker.balls += 1;
    battingTeam.score += runs;
    battingTeam.balls += 1;
    newMatch.currentBowler.runs += runs;
    newMatch.currentBowler.balls += 1;

    if (runs % 2 === 1 && !singleBatsman) {
      newMatch.currentBatsmen.forEach(b => b.onStrike = !b.onStrike);
    }

    const ballData = { type: 'runs', runs, bowler: newMatch.currentBowler.name, batsman: striker.name };
    newMatch.ballHistory.push(ballData);
    if (newMatch.currentInnings === 1) {
      newMatch.innings1BallHistory.push(ballData);
    } else {
      newMatch.innings2BallHistory.push(ballData);
    }

    if (battingTeam.balls % 6 === 0) {
      battingTeam.overs += 1;
      newMatch.currentBowler.overs += 1;
      newMatch.currentBatsmen.forEach(b => b.onStrike = !b.onStrike);
    }

    checkInningsEnd(newMatch);
    setMatch(newMatch);
  };

  const addWicket = () => {
    if (!match || match.winner) return;

    const newMatch = { ...match };
    const battingTeam = newMatch.currentInnings === 1 ? newMatch.team1 : newMatch.team2;
    const battingTeamData = teams.find(t => t.id === (newMatch.currentInnings === 1 ? newMatch.team1.id : newMatch.team2.id));
    
    battingTeam.wickets += 1;
    battingTeam.balls += 1;
    newMatch.currentBowler.balls += 1;
    newMatch.currentBowler.wickets += 1;

    const strikerIndex = newMatch.currentBatsmen.findIndex(b => b.onStrike);
    const ballData = { 
      type: 'wicket', 
      bowler: newMatch.currentBowler.name, 
      batsman: newMatch.currentBatsmen[strikerIndex].name 
    };
    newMatch.ballHistory.push(ballData);
    if (newMatch.currentInnings === 1) {
      newMatch.innings1BallHistory.push(ballData);
    } else {
      newMatch.innings2BallHistory.push(ballData);
    }

    if (battingTeam.wickets < battingTeamData.players.length - 1) {
      const nextBatsman = battingTeamData.players.find(
        p => !newMatch.currentBatsmen.some(b => b.id === p.id)
      );
      if (nextBatsman) {
        newMatch.currentBatsmen[strikerIndex] = { 
          ...nextBatsman, 
          runs: 0, 
          balls: 0, 
          onStrike: true 
        };
      } else {
        // Only one batsman remains - remove the out batsman
        newMatch.currentBatsmen[strikerIndex] = { id: null, name: '', runs: 0, balls: 0, onStrike: false };
      }
    } else {
      // Last wicket - remove the out batsman
      newMatch.currentBatsmen[strikerIndex] = { id: null, name: '', runs: 0, balls: 0, onStrike: false };
    }

    if (battingTeam.balls % 6 === 0) {
      battingTeam.overs += 1;
      newMatch.currentBowler.overs += 1;
      newMatch.currentBatsmen.forEach(b => b.onStrike = !b.onStrike);
    }

    checkInningsEnd(newMatch);
    setMatch(newMatch);
  };

  const addWide = () => {
    if (!match || match.winner) return;

    const newMatch = { ...match };
    const battingTeam = newMatch.currentInnings === 1 ? newMatch.team1 : newMatch.team2;
    const striker = newMatch.currentBatsmen.find(b => b.onStrike);

    // Wide: 1 run added, ball doesn't count
    battingTeam.score += 1;
    newMatch.currentBowler.runs += 1;

    const ballData = { type: 'wide', runs: 1, bowler: newMatch.currentBowler.name, batsman: striker.name };
    newMatch.ballHistory.push(ballData);
    if (newMatch.currentInnings === 1) {
      newMatch.innings1BallHistory.push(ballData);
    } else {
      newMatch.innings2BallHistory.push(ballData);
    }

    checkInningsEnd(newMatch);
    setMatch(newMatch);
  };

  const addNoBall = (runs = 0) => {
    if (!match || match.winner) return;

    const newMatch = { ...match };
    const battingTeam = newMatch.currentInnings === 1 ? newMatch.team1 : newMatch.team2;
    const striker = newMatch.currentBatsmen.find(b => b.onStrike);
    
    // Check if only one batsman remains
    const activeBatsmen = newMatch.currentBatsmen.filter(b => b.id);
    const singleBatsman = activeBatsmen.length === 1;
    
    // If single batsman, don't allow odd runs
    if (singleBatsman && runs % 2 === 1) {
      return;
    }

    // No ball: 1 run penalty + runs scored, ball doesn't count
    const totalRuns = 1 + runs;
    striker.runs += runs;
    battingTeam.score += totalRuns;
    newMatch.currentBowler.runs += totalRuns;

    if (runs % 2 === 1 && !singleBatsman) {
      newMatch.currentBatsmen.forEach(b => b.onStrike = !b.onStrike);
    }

    const ballData = { type: 'noball', runs: totalRuns, bowler: newMatch.currentBowler.name, batsman: striker.name };
    newMatch.ballHistory.push(ballData);
    if (newMatch.currentInnings === 1) {
      newMatch.innings1BallHistory.push(ballData);
    } else {
      newMatch.innings2BallHistory.push(ballData);
    }

    checkInningsEnd(newMatch);
    setMatch(newMatch);
  };

  const changeBowler = (bowlerId) => {
    const newMatch = { ...match };
    const bowlingTeamData = teams.find(t => t.id === newMatch.bowlingTeam);
    const newBowler = bowlingTeamData.players.find(p => p.id === bowlerId);
    
    newMatch.currentBowler = { ...newBowler, overs: 0, balls: 0, runs: 0, wickets: 0 };
    setMatch(newMatch);
  };

  const checkInningsEnd = (newMatch) => {
    const battingTeam = newMatch.currentInnings === 1 ? newMatch.team1 : newMatch.team2;
    const battingTeamData = teams.find(t => t.id === (newMatch.currentInnings === 1 ? newMatch.team1.id : newMatch.team2.id));
    
    // Check if all batsmen are out (no active batsmen left)
    const activeBatsmen = newMatch.currentBatsmen.filter(b => b.id);
    const allOut = activeBatsmen.length === 0 || battingTeam.wickets >= battingTeamData.players.length - 1;
    const oversComplete = battingTeam.overs >= newMatch.totalOvers;
    const targetChased = newMatch.target && battingTeam.score > newMatch.target;

    if (allOut || oversComplete || targetChased) {
      if (newMatch.currentInnings === 1) {
        newMatch.currentInnings = 2;
        newMatch.target = battingTeam.score;
        newMatch.battingTeam = newMatch.team2.id;
        newMatch.bowlingTeam = newMatch.team1.id;
        
        const team2Data = teams.find(t => t.id === newMatch.team2.id);
        const team1Data = teams.find(t => t.id === newMatch.team1.id);
        
        newMatch.currentBatsmen = [
          { ...team2Data.players[0], runs: 0, balls: 0, onStrike: true },
          { ...team2Data.players[1], runs: 0, balls: 0, onStrike: false }
        ];
        newMatch.currentBowler = { ...team1Data.players[0], overs: 0, balls: 0, runs: 0, wickets: 0 };
      } else {
        if (newMatch.team2.score > newMatch.team1.score) {
          newMatch.winner = newMatch.team2.name;
        } else if (newMatch.team1.score > newMatch.team2.score) {
          newMatch.winner = newMatch.team1.name;
        } else {
          newMatch.winner = 'Match Tied';
        }
      }
    }
  };

  const resetMatch = () => {
    if (confirm('Reset current match?')) {
      setMatch(null);
      setScreen('home');
    }
  };

  // Render functions
  const renderHome = () => (
    <div className="min-h-screen bg-gradient-to-br from-green-600 to-blue-600 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-6 mb-6">
          <h1 className="text-4xl font-bold text-center mb-2 text-gray-800">🏏 Cricket Scorer</h1>
          <p className="text-center text-gray-600">Manage teams and score matches</p>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-6 mb-4">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800">Teams</h2>
            <button
              onClick={addTeam}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-blue-600 transition"
            >
              <Plus size={20} /> Add Team
            </button>
          </div>

          {teams.length === 0 ? (
            <p className="text-gray-500 text-center py-8">No teams yet. Create your first team!</p>
          ) : (
            <div className="space-y-3">
              {teams.map(team => (
                <div key={team.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-gray-800">{team.name}</h3>
                      <p className="text-gray-600">{team.players.length} players</p>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        {team.players.map(player => (
                          <div key={player.id} className="flex items-center gap-1 bg-gray-100 px-2 py-1 rounded">
                            <span>{getAvatar(player.avatarIndex)}</span>
                            <span className="text-sm text-black">{player.name}</span>
                            {player.isCaptain && <Star size={12} className="text-yellow-500 fill-yellow-500" />}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setEditingTeam(team);
                          setScreen('editTeam');
                        }}
                        className="text-blue-500 hover:text-blue-700"
                      >
                        <Edit2 size={20} />
                      </button>
                      <button
                        onClick={() => deleteTeam(team.id)}
                        className="text-red-500 hover:text-red-700"
                      >
                        <Trash2 size={20} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <button
          onClick={startMatch}
          disabled={teams.length < 2}
          className="w-full bg-green-500 text-white py-4 rounded-xl text-xl font-bold flex items-center justify-center gap-2 hover:bg-green-600 transition disabled:bg-gray-300 disabled:cursor-not-allowed"
        >
          <Play size={24} /> Start New Match
        </button>
      </div>
    </div>
  );

  const renderEditTeam = () => (
    <div className="min-h-screen bg-gradient-to-br from-purple-600 to-pink-600 p-4">
      <div className="max-w-2xl mx-auto">
        <div className="bg-white rounded-2xl shadow-2xl p-6">
          <h2 className="text-3xl font-bold mb-6 text-gray-800">
            {teams.find(t => t.id === editingTeam.id) ? 'Edit Team' : 'Create Team'}
          </h2>

          <div className="mb-6">
            <label className="block text-gray-700 font-semibold mb-2">Team Name</label>
            <input
              type="text"
              value={editingTeam.name}
              onChange={(e) => setEditingTeam({ ...editingTeam, name: e.target.value })}
              className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-purple-500 outline-none text-black!"
              placeholder="Enter team name"
            />
          </div>

          <div className="mb-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-xl font-bold text-gray-800">Players</h3>
              <button
                onClick={addPlayer}
                disabled={editingTeam.players.length >= 11}
                className="bg-purple-500 text-white px-3 py-1 rounded-lg flex items-center gap-1 hover:bg-purple-600 transition disabled:bg-gray-300"
              >
                <Plus size={18} /> Add Player
              </button>
            </div>

            <div className="space-y-3 max-h-96 overflow-y-auto">
              {editingTeam.players.map(player => (
                <div key={player.id} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{getAvatar(player.avatarIndex)}</div>
                    <input
                      type="text"
                      value={player.name}
                      onChange={(e) => updatePlayer(player.id, 'name', e.target.value)}
                      className="flex-1 border border-gray-300 rounded px-3 py-2 focus:border-purple-500 outline-none"
                      placeholder="Player name"
                    />
                    <button
                      onClick={() => updatePlayer(player.id, 'isCaptain', !player.isCaptain)}
                      className={`p-2 rounded ${player.isCaptain ? 'bg-yellow-400' : 'bg-gray-200'} hover:bg-yellow-300 transition`}
                      title="Captain"
                    >
                      <Star size={20} className={player.isCaptain ? 'fill-yellow-600' : ''} />
                    </button>
                    <button
                      onClick={() => deletePlayer(player.id)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={20} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={() => {
                setEditingTeam(null);
                setScreen('home');
              }}
              className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-400 transition"
            >
              Cancel
            </button>
            <button
              onClick={saveTeam}
              className="flex-1 bg-purple-500 text-white py-3 rounded-lg font-semibold hover:bg-purple-600 transition flex items-center justify-center gap-2"
            >
              <Save size={20} /> Save Team
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSelectTeams = () => {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-500 to-red-600 p-4">
        <div className="max-w-xl mx-auto">
          <div className="bg-white rounded-2xl shadow-2xl p-6">
            <h2 className="text-3xl font-bold mb-6 text-gray-800 text-center">Match Setup</h2>

            <div className="space-y-4">
              <div>
                <label className="block text-gray-700 font-semibold mb-2">Team 1</label>
                <select
                  value={selectedTeam1}
                  onChange={(e) => setSelectedTeam1(e.target.value)}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-orange-500 outline-none"
                >
                  <option value="">Select Team 1</option>
                  {teams.map(team => (
                    <option key={team.id} value={team.id} disabled={team.id === selectedTeam2}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">Team 2</label>
                <select
                  value={selectedTeam2}
                  onChange={(e) => setSelectedTeam2(e.target.value)}
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-orange-500 outline-none"
                >
                  <option value="">Select Team 2</option>
                  {teams.map(team => (
                    <option key={team.id} value={team.id} disabled={team.id === selectedTeam1}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-gray-700 font-semibold mb-2">Number of Overs</label>
                <input
                  type="number"
                  value={overs}
                  onChange={(e) => setOvers(Math.max(1, Math.min(50, parseInt(e.target.value) || 1)))}
                  min="1"
                  max="50"
                  className="w-full border-2 border-gray-300 rounded-lg px-4 py-2 focus:border-orange-500 outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setScreen('home')}
                className="flex-1 bg-gray-300 text-gray-700 py-3 rounded-lg font-semibold hover:bg-gray-400 transition"
              >
                Back
              </button>
              <button
                onClick={() => {
                  if (selectedTeam1 && selectedTeam2) {
                    initializeMatch(selectedTeam1, selectedTeam2, overs);
                  } else {
                    alert('Please select both teams');
                  }
                }}
                className="flex-1 bg-orange-500 text-white py-3 rounded-lg font-semibold hover:bg-orange-600 transition"
              >
                Start Match
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderScoring = () => {
    if (!match) return null;

    const battingTeam = match.currentInnings === 1 ? match.team1 : match.team2;
    const bowlingTeamId = match.currentInnings === 1 ? match.team2.id : match.team1.id;
    const bowlingTeamData = teams.find(t => t.id === bowlingTeamId);

    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600 to-purple-600 p-4">
        <div className="max-w-4xl mx-auto">
          {match.winner ? (
            <div className="bg-white rounded-2xl shadow-2xl p-8 text-center">
              <Trophy size={80} className="mx-auto text-yellow-500 mb-4" />
              <h1 className="text-4xl font-bold mb-4 text-gray-800">{match.winner}</h1>
              <p className="text-xl text-gray-600 mb-6">
                {match.winner === 'Match Tied' ? 'What a thrilling tie!' : 'Wins the Match!'}
              </p>
              
              <div className="grid md:grid-cols-2 gap-4 mb-6">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-bold text-lg mb-2 text-black">{match.team1.name}</h3>
                  <p className="text-3xl font-bold text-black">{match.team1.score}/{match.team1.wickets}</p>
                  <p className="text-black">({match.team1.overs}.{match.team1.balls % 6} overs)</p>
                </div>
                <div className="bg-purple-50 p-4 rounded-lg">
                  <h3 className="font-bold text-lg mb-2 text-black">{match.team2.name}</h3>
                  <p className="text-3xl font-bold text-black">{match.team2.score}/{match.team2.wickets}</p>
                  <p className="text-black">({match.team2.overs}.{match.team2.balls % 6} overs)</p>
                </div>
              </div>

              <button
                onClick={resetMatch}
                className="bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-600 transition flex items-center gap-2 mx-auto"
              >
                <RotateCcw size={20} /> New Match
              </button>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-2xl shadow-2xl p-6 mb-4">
                <div className="flex justify-between items-center mb-4">
                  <h2 className="text-2xl font-bold text-gray-800">
                    Innings {match.currentInnings}
                  </h2>
                  <button
                    onClick={resetMatch}
                    className="text-red-500 hover:text-red-700"
                  >
                    <RotateCcw size={24} />
                  </button>
                </div>

                <div className="grid md:grid-cols-2 gap-4 mb-4">
                  <div className={`p-4 rounded-lg ${match.currentInnings === 1 ? 'bg-blue-100' : 'bg-gray-100'}`}>
                    <h3 className="font-semibold text-black">{match.team1.name}</h3>
                    <p className="text-3xl font-bold text-black">{match.team1.score}/{match.team1.wickets}</p>
                    <p className="text-sm text-black">Overs: {match.team1.overs}.{match.team1.balls % 6}/{match.totalOvers}</p>
                  </div>
                  <div className={`p-4 rounded-lg ${match.currentInnings === 2 ? 'bg-blue-100' : 'bg-gray-100'}`}>
                    <h3 className="font-semibold text-black">{match.team2.name}</h3>
                    <p className="text-3xl font-bold text-black">{match.team2.score}/{match.team2.wickets}</p>
                    <p className="text-sm text-black">Overs: {match.team2.overs}.{match.team2.balls % 6}/{match.totalOvers}</p>
                  </div>
                </div>

                {match.target && (
                  <div className="bg-yellow-100 p-3 rounded-lg text-center mb-4">
                    <p className="font-semibold text-black">Target: {match.target + 1} runs</p>
                    <p className="text-sm text-black">Need {match.target + 1 - battingTeam.score} runs from {(match.totalOvers - battingTeam.overs) * 6 - (battingTeam.balls % 6)} balls</p>
                  </div>
                )}

                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <h3 className="font-semibold mb-2 text-black">Current Batsmen</h3>
                  <div className="space-y-2">
                    {match.currentBatsmen.filter(b => b.id).map(batsman => (
                      <div key={batsman.id} className={`flex items-center justify-between p-2 rounded ${batsman.onStrike ? 'bg-green-200' : 'bg-white'}`}>
                        <div className="flex items-center gap-2">
                          <span className="text-2xl">{getAvatar(batsman.avatarIndex)}</span>
                          <span className="font-semibold text-black">{batsman.name}</span>
                          {batsman.onStrike && <span className="text-xs bg-green-600 text-white px-2 py-1 rounded">ON STRIKE</span>}
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-black">{batsman.runs} ({batsman.balls})</p>
                        </div>
                      </div>
                    ))}
                  </div>
                  {match.currentBatsmen.filter(b => b.id).length === 1 && (
                    <p className="text-xs text-orange-600 mt-2 font-semibold">⚠️ Single batsman - only even runs allowed (0, 2, 4, 6)</p>
                  )}
                </div>

                <div className="bg-gray-50 p-4 rounded-lg mb-4">
                  <div className="flex justify-between items-center mb-2">
                    <h3 className="font-semibold text-black">Current Bowler</h3>
                    <select
                      value={match.currentBowler.id}
                      onChange={(e) => changeBowler(e.target.value)}
                      className="border border-gray-300 rounded px-2 py-1 text-sm"
                    >
                      {bowlingTeamData.players.map(player => (
                        <option key={player.id} value={player.id}>{player.name}</option>
                      ))}
                    </select>
                  </div>
                  <div className="flex items-center justify-between p-2 bg-white rounded">
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{getAvatar(match.currentBowler.avatarIndex)}</span>
                      <span className="font-semibold text-black">{match.currentBowler.name}</span>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-black">{match.currentBowler.wickets}-{match.currentBowler.runs}</p>
                      <p className="text-sm text-black">({match.currentBowler.overs}.{match.currentBowler.balls % 6})</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-4 gap-2 mb-4">
                  {[0, 1, 2, 3, 4, 6].map(runs => {
                    const activeBatsmen = match.currentBatsmen.filter(b => b.id);
                    const singleBatsman = activeBatsmen.length === 1;
                    const isOddRun = runs % 2 === 1;
                    const disabled = singleBatsman && isOddRun;
                    
                    return (
                      <button
                        key={runs}
                        onClick={() => addRuns(runs)}
                        disabled={disabled}
                        className={`py-4 rounded-lg text-xl font-bold transition active:scale-95 ${
                          disabled 
                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed' 
                            : 'bg-blue-500 text-white hover:bg-blue-600'
                        }`}
                      >
                        {runs}
                      </button>
                    );
                  })}
                  <button
                    onClick={addWicket}
                    className="bg-red-500 text-white py-4 rounded-lg text-xl font-bold hover:bg-red-600 transition active:scale-95 col-span-2"
                  >
                    WICKET
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 mb-4">
                  <button
                    onClick={addWide}
                    className="bg-yellow-500 text-white py-3 rounded-lg font-bold hover:bg-yellow-600 transition active:scale-95"
                  >
                    WIDE (+1)
                  </button>
                  <button
                    onClick={() => addNoBall(0)}
                    className="bg-orange-500 text-white py-3 rounded-lg font-bold hover:bg-orange-600 transition active:scale-95"
                  >
                    NO BALL (+1)
                  </button>
                </div>

                {(match.innings1BallHistory.length > 0 || match.innings2BallHistory.length > 0) && (
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <h3 className="font-semibold mb-3 text-black">Ball History</h3>
                    
                    {match.innings1BallHistory.length > 0 && (
                      <div className="mb-3">
                        <p className="text-sm font-semibold text-black mb-2">Innings 1 - {match.team1.name}</p>
                        <div className="flex flex-wrap gap-2">
                          {match.innings1BallHistory.slice(-12).reverse().map((ball, idx) => (
                            <div
                              key={idx}
                              className={`w-10 h-10 flex items-center justify-center rounded-full font-bold ${
                                ball.type === 'wicket' ? 'bg-red-500 text-white' : 
                                ball.type === 'wide' ? 'bg-yellow-500 text-white' :
                                ball.type === 'noball' ? 'bg-orange-500 text-white' :
                                'bg-blue-500 text-white'
                              }`}
                            >
                              {ball.type === 'wicket' ? 'W' : 
                               ball.type === 'wide' ? 'WD' :
                               ball.type === 'noball' ? 'NB' :
                               ball.runs}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {match.innings2BallHistory.length > 0 && (
                      <div>
                        <p className="text-sm font-semibold text-black mb-2">Innings 2 - {match.team2.name}</p>
                        <div className="flex flex-wrap gap-2">
                          {match.innings2BallHistory.slice(-12).reverse().map((ball, idx) => (
                            <div
                              key={idx}
                              className={`w-10 h-10 flex items-center justify-center rounded-full font-bold ${
                                ball.type === 'wicket' ? 'bg-red-500 text-white' : 
                                ball.type === 'wide' ? 'bg-yellow-500 text-white' :
                                ball.type === 'noball' ? 'bg-orange-500 text-white' :
                                'bg-purple-500 text-white'
                              }`}
                            >
                              {ball.type === 'wicket' ? 'W' : 
                               ball.type === 'wide' ? 'WD' :
                               ball.type === 'noball' ? 'NB' :
                               ball.runs}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    );
  };

  // Main render
  return (
    <>
      <style jsx global>{`
        input, input::placeholder {
          color: black !important;
        }
        input[type="text"] {
          color: black !important;
        }
      `}</style>
      {screen === 'home' && renderHome()}
      {screen === 'editTeam' && renderEditTeam()}
      {screen === 'selectTeams' && renderSelectTeams()}
      {screen === 'scoring' && renderScoring()}
    </>
  );
};

export default CricketScorer;