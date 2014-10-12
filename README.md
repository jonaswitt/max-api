
MAX! API
========

A Node.js based REST API for the MAX! heating control system by eq-3
(http://www.eq-3.de/max-heizungssteuerung.html).

The objective of this project is to implement everything that is known about the
proprietary MAX! Cube protocol in a modern language that will run on most
platforms and make cube state information and supported commands (such as setting
the desired temperature) available through a standards-based JSON/REST API, to
enable development of MAX! clients in a language/platform of choice without
having to re-implement the MAX! protocol.

Currently supported features
----------------------------

- GET /cubes
  Return all MAX! cubes on the local network as a JSON array (contains IP address,
  port and firmware)

- GET /cubes/:ip
  Return status information about the cube specified by IP address :ip as a
  structured JSON object

Getting Started
---------------

The requirement to run this program is Node.js (see http://nodejs.org/ for
details / installation).

To install this program's dependencies, use the node package manager and run
`npm install -g`

To run this program, simply type `node app.js` - open http://localhost:3000/cubes
in your browser to see a list of cubes or http://localhost:3000/cubes/cube_ip to
get detailed state information about one cube.
