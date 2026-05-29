# Login Route in the backend>src>routes>auth.js
### removed SENSITIVE CONSOLE LOG: Logging plain-text passwords on login attempts!
### added zod based validations 
### Used common response object 
### Used http only cookies based token's instead of directly sending the token to the client 
###  

# GET /doctor-stats - [System Audit Reports]
### reduced response time using the promise all 
### instead of querying sequentially , queried simultaniously
### used common response object 
### in text the response time came down to 2130  from 5456 

# GET /api/doctors - [SQL Vulnerability - Staff Physicians Registry Lookup]
### changes the entire flow by fetching all teh doctors irecpective of specilizations and search value at first and then
### filtered in the front end itself instead of calling the backed on each search. 
### Added new drop down that has the specilizations of the existing doctors as values and removed the button and made the filtering event 
### based on the input and select changes.
### From my understanding this is the standard industry approach instead letting the user in the front to directly input SQL query
### Also added authorization middlewar to the route so, only admins and RECEPTIONISTs are permitted to access this route. 

# POST /api/patients - [register new patients]


# entire auth route 
### Implemented 