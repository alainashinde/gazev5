NEW FEATURES: 
- Gives a distracted notifications (with sound if wanted) if eyes away or face not detected
- Options UI for types of notifications + toggle on/off extension
- No longer the "you switched tabs" bug for focus sites


FEATURES THAT NEED TO BE FIXED IN FUTURE:
- Priority 1: reward system in Today Summary (ur focused for X minutes) -- wont do in notifs cus thats prob just more distracting
- nicer logo/design touches

installation instructions--

terminal : 

cd Desktop/filename  
python3 -m venv venv  
source venv/bin/activate  
pip3 install -r requirements.txt  
python3 app/server.py            
- server runs at http://127.0.0.1:5000/



In a separate terminal but under the venv, run the eye tracker: python3 eye_tracker.py USERNAME   
- This opens a webcam window; press 'q' to quit.
- remember to include username, i.e. 'Alaina' or it will default to default_user and eye_tracker data will not record to CSV


Other troubleshooting:
  - On macOS give permissions to Chrome for notifications/sound + make sure Focus/DnD is off
