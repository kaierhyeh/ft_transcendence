// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

//This code is used in remix.ethereum.org: A compiler to launch a smart contract.
//You can find all the code below:

contract TournamentStorage {
    struct Tournament {
        uint256 tournamentId;
        uint256 playersCount;
        string winnerName;
        uint256 date;
    }

    Tournament[] private tournaments;

    event TournamentAdded(uint256 tournamentId, uint256 playersCount, string winnerName, uint256 date);

    function addTournament(
        uint256 tournamentId, 
        uint256 playersCount, 
        string memory winnerName
    ) public {
        require(!tournamentExists(tournamentId), "Tournament ID already exists");
        uint256 date = block.timestamp;
        tournaments.push(Tournament(tournamentId, playersCount, winnerName, date));
        emit TournamentAdded(tournamentId, playersCount, winnerName, date);
    }

    function tournamentExists(uint256 tournamentId) public view returns (bool) {
        for (uint256 i = 0; i < tournaments.length; i++) {
            if (tournaments[i].tournamentId == tournamentId) {
                return true;
            }
        }
        return false;
    }

    function getAllTournaments() public view returns (Tournament[] memory) {
        return tournaments;
    }

    function getNextId() public view returns (uint256) {
        return tournaments.length + 1;
    }
}

