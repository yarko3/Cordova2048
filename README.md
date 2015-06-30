# Sliding Tile Puzzle based on Cordova2048
This is a sliding tile puzzle based on 2048 that will be used to visualize some puzzle-solving algorithms.

Currently implemented features:
- basic sliding tile functionality
- goal state recognition
- high score (lower number of moves is better)
- AI traversal algorithms (Bounded DFS, iterative deepening DFS)
- a 'solve' button currently for testing

Future features:
- a button to stop AI traversal
- AI traversal algorithms (IDA*)
- visualize the traversal (show individual moves - may need to simulate input/place delay)

Issues:
- DFS has excessive memory usage (should be O(d) where d is the depth of current traversal)

This software is under the MIT license, as outlined in the //2048/LICENSE.txt file.
