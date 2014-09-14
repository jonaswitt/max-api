
MAX! API
========

A node.js based REST API for the MAX! heating control system by eq-3 (http://www.eq-3.de/max-heizungssteuerung.html).

Currently supported features
----------------------------

- GET /cubes
  Return all MAX! cubes on the local network as a JSON array

- GET /cubes/:ip
  Return status information about the cube specified by IP address :ip as a structured JSON object
