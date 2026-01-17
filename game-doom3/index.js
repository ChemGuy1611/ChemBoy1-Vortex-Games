/*//////////////////////////////////////////
Name: DOOM 3 & DOOM 3: BFG Edition Vortex Extension
Structure: Basic multi-game with multiple exes
Author: ChemBoy1
Version: 0.4.1
Date: 2026-01-16
/////////////////////////////////////////*/
/*
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣀⣀⣀⣀⣠⣤⣤⣤⡴⣦⡴⣖⠶⣴⠶⡶⣖⡶⣶⢶⣲⡾⠿⢿⡷⣾⢿⣷⣦⢾⣷⣾⣶⣤⣀⣰⣤⣀⡀⠀⠀⢀⣴⣿⡿⡿⣿⣿⣦⣄⠀⠀⣠⣴⣿⡿⢿⡿⣷⣦⡄⠀⠀⢀⣀⣤⣦⣀⣤⣶⣶⣷⣦⣴⡿⢿⡷⣿⠿⡿⣿⣷⢶⣦⢴⡲⣦⢶⡶⢶⡲⣖⡶⣦⣤⣤⣤⣤⣤⣤⣀⣀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⣀⣤⣴⠶⣟⣻⣙⡏⡽⣬⢳⠴⣣⣔⡳⣤⣒⣖⡳⣰⠣⠖⠤⠶⠤⢦⣥⣭⣭⣐⣘⣘⣋⠐⠘⠛⠒⠚⠲⢮⠽⣍⣛⣻⣿⣿⣶⣿⡿⡷⣿⣽⣳⠿⣽⣿⣿⣾⣿⣯⣷⣟⡿⣟⡷⣿⣿⣶⣿⣿⣟⣫⣙⠯⡶⠞⠒⠒⠛⠃⠘⣋⣓⣀⣣⣬⣭⣬⠴⠤⠦⠵⠰⡔⣒⢦⣓⣔⣲⣒⢦⡱⢎⡵⣫⢵⣋⣏⣻⠟⣶⢦⣤⣀⡀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⢀⣠⣤⣶⣿⣿⣯⣷⣾⣿⣾⣷⣿⣽⣿⣽⣿⣿⣿⣾⣽⣯⣿⣭⣿⣽⣻⣟⣻⡟⣷⢶⡶⢶⣥⣮⣍⣛⣉⢛⠛⠓⠒⠶⢦⣄⣀⠠⢈⠻⡰⣹⣽⠭⠗⠛⠑⠨⠘⠉⣿⢃⡙⠋⡘⡷⠌⠆⠑⠚⠛⠷⢭⣧⣯⢎⣻⠍⢀⣀⣀⣴⠶⠒⠚⠛⣋⣉⣛⣩⣴⣴⡶⣶⢶⣞⡿⣛⣟⣟⣯⣿⣽⣯⣷⣿⣿⣿⣿⣿⣽⣿⣿⣾⣷⣿⣷⣾⣷⣯⣿⣿⣷⣶⣤⡀⠀⠀
⢶⠿⠟⠛⠛⠛⠛⠋⠉⠉⠉⠉⠉⠉⠉⠉⠉⠉⠉⠙⠛⠛⠛⠛⠛⠿⠿⠿⢿⣿⣿⣿⣿⣿⣿⣯⣿⣞⣽⣻⡽⣿⢿⠿⣶⣶⣦⣤⡈⠙⣠⢊⢝⢎⠞⠀⠀⠀⠀⢀⢀⣁⠘⠙⠣⠜⠋⠇⣈⣀⡀⠀⠀⠀⢀⠱⡑⡀⡐⢞⢛⣉⣤⣤⣶⣶⠾⣿⢿⣏⣿⣛⣮⣷⣿⣿⣿⣿⣿⣿⣿⡿⠿⠿⠿⠛⠛⠛⠛⠛⠉⠉⠉⠉⠉⠉⠉⠉⠉⠉⠉⠉⠉⠛⠛⠛⠻⠿⠿⢶
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠉⠛⠛⠿⣿⣿⣿⣿⣿⣾⣿⣟⣹⣷⣯⣿⢫⡿⣰⢃⢚⠌⡔⠂⠀⣠⣔⡟⠃⠂⠠⠀⠀⠂⠀⠀⠐⠚⢻⠢⣄⠀⠀⢂⠱⡈⡘⢆⢣⡼⣿⣽⣾⣏⣻⣽⣾⣿⣿⣿⣿⣿⠿⠛⠛⠉⠉⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠙⠛⠛⢿⡿⣿⣿⣿⣿⣿⣿⣾⣷⢫⢊⠒⡀⣴⣞⡃⠉⠀⡴⣠⠂⡜⠀⠀⢣⠐⢄⢀⠀⠉⠉⢳⣖⢤⠀⡑⡜⣾⣧⣿⣿⣿⣿⣿⣿⢿⡿⠛⠛⠋⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠛⣿⣿⣿⣿⣿⠛⢱⠃⡅⣿⡟⢪⠂⢢⡞⣴⠃⡞⠁⠀⠀⠀⢳⠈⣦⠑⡄⠀⠋⡞⣧⠐⠈⡎⠙⣿⣿⣿⣿⣿⡟⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣿⣿⣿⣿⣷⣷⣃⢞⣼⣿⣷⣣⡴⢋⡼⠃⡼⡁⠀⠀⠀⠀⠈⣦⠈⢧⡘⢢⡐⢤⣿⣧⡒⢜⣞⣮⣿⣿⣿⣿⠄⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣾⣿⣿⣟⡿⣯⠶⢛⡥⡽⣖⡟⠺⣿⠇⢸⡃⠌⢢⠀⠀⡀⠂⢈⡇⠘⢿⡦⢿⣳⠮⠨⣿⡶⣿⢿⣻⣿⣿⣿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢹⣿⣿⣯⡿⡽⣿⢄⡷⢖⠛⠃⠦⣍⠢⣀⠙⢦⡆⣸⢣⢘⣤⠞⣤⣰⢏⡵⠝⠛⡒⠾⡄⢷⢻⡿⣽⣿⢿⣏⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣾⣿⣾⣏⢷⡱⡝⢿⣾⣿⣷⣯⣆⠈⢿⡦⠙⠤⠑⣿⢸⠛⠡⡅⢩⡾⠿⣀⣸⣷⣿⣿⣿⢛⡿⣹⢿⣾⣿⣿⡆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢘⣿⣿⣿⣾⡷⣿⣿⡿⣯⠉⢻⣿⡀⡄⣿⣦⣠⣄⣿⣾⣇⣤⣀⣿⢇⡄⣾⡿⠋⣹⡿⣿⣿⡿⣧⣿⣿⣝⣏⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢀⣾⣿⣿⣿⣿⣟⢿⣼⣄⠘⢷⣤⡿⣷⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣿⣷⡿⣧⣴⠛⢀⣽⣿⢿⣿⣿⣿⣿⣿⡆⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⣿⣿⣿⣿⣿⣿⢮⣛⠿⣿⠛⠛⣷⣯⣟⡴⡣⠝⣿⣟⡛⣿⡗⠭⣳⣜⣿⣷⡝⢟⢻⡿⢟⣣⢾⣿⣿⣿⣻⣿⠇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠙⣿⣿⣿⣿⠻⣟⣋⢁⣷⣸⡟⣧⢿⣿⡔⠩⢼⡗⢐⡿⠌⠱⣼⣿⢷⠏⣷⣸⣆⣉⣛⡷⣿⣿⣿⣿⡟⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⠛⠛⣿⡿⣼⣯⡳⣞⡽⡇⣎⣏⣿⡱⠀⠈⢁⡆⠃⠀⣲⣼⣏⣏⡆⣿⣽⡴⣫⣧⡾⣿⡏⠛⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢰⣿⡿⣿⣿⣿⣾⣿⣑⡏⢆⣿⣿⣆⡀⢺⣿⠀⣸⣾⣿⣇⠎⣗⣳⣿⣾⣿⣿⣿⣿⣧⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⣿⣿⣿⣿⣿⣿⣿⣿⡀⠀⢿⣿⣿⡷⣾⣿⣶⣿⣿⣿⠥⠀⣺⣿⣿⣿⣿⣿⣿⣿⣇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣴⣿⣿⣿⣿⣿⣿⣿⣿⣿⡟⣀⠘⣿⡿⣇⣿⣿⣷⣿⣿⡏⢀⢸⣿⢿⣿⣿⣿⣿⣿⣿⣿⣷⡀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢿⣿⣟⢿⣿⣿⣿⣿⣿⣿⢻⡾⡦⣙⡶⡇⣿⢻⣌⡻⢞⣡⣻⣾⢹⣿⣿⣿⣿⣿⣿⢿⣿⣿⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠸⢿⣿⣜⢻⡻⣿⡿⣿⣿⣿⣿⣧⣛⣤⠿⠻⡜⠻⣧⡜⣸⣿⣿⣿⣿⠿⣿⡿⡣⢘⣿⣧⠿⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⢿⣆⠙⣻⠃⣿⣿⣝⣆⢻⠉⡿⠚⠳⡟⠛⢺⡏⣽⢃⣏⣿⣿⡇⢿⡀⢁⣿⠋⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⣿⠀⢳⣤⠙⣿⣯⣻⢾⣇⣇⡄⠀⡃⣠⢸⣧⡿⢾⣻⣿⠟⢠⣾⠃⢻⡇⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⢠⡏⢸⡘⣿⣶⣟⣽⠿⣾⣦⣫⡉⠉⡏⠉⣹⣡⣶⡿⢿⣜⣶⣿⠟⣸⠘⣧⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠘⢿⣼⣿⣿⣿⣿⢿⣿⣿⣿⣻⡟⢿⡿⢟⣟⣿⣽⢿⣿⢿⣿⣿⣿⣯⣾⠟⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠉⠛⢿⣿⣄⠛⣿⣞⣝⠻⠿⠻⢟⠻⠟⢛⣽⣾⠟⢁⣽⣿⠟⠋⠁⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠈⠛⠿⣷⣮⣹⣿⣶⡶⣦⣤⡶⢶⣿⣿⣩⣾⣿⠟⠉⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀⠀
//*/

//Import libraries
const { actions, fs, util, selectors, log } = require('vortex-api');
const path = require('path');
const template = require('string-template');
const { download, findModByFile, findDownloadIdByFile, resolveVersionByPattern, testRequirementVersion } = require('./downloader');
const { parseStringPromise } = require('xml2js');

//Specify all information about the game
const GAME_ID = "doom3";
const GAME_ID_BFG = "doom3bfgedition";
const STEAMAPP_ID = "9050";
const STEAMAPP_ID_BFG = "208200";
const GOGAPP_ID = "1492054092";
const GOGAPP_ID_BFG = "1135892318";
const XBOXAPP_ID = "BethesdaSoftworks.Doom32004";
const XBOXEXECNAME = "Game";
const XBOXAPP_ID_BFG = "BethesdaSoftworks.Doom32004";
const XBOXEXECNAME_BFG = "Game";
const GAME_NAME = "DOOM 3";
const GAME_NAME_BFG = "DOOM 3: BFG Edition";
const GAME_NAME_SHORT_BFG = "DOOM 3 BFG";

let GAME_PATH = null;
let GAME_PATH_BFG = null;
let STAGING_FOLDER = '';
let STAGING_FOLDER_BFG = '';
let DOWNLOAD_FOLDER = '';
let DOWNLOAD_FOLDER_BFG = '';
const APPMANIFEST_FILE = 'appxmanifest.xml';

const gameFinderQuery = {
  steam: [{ id: STEAMAPP_ID, prefer: 0 }, { id: STEAMAPP_ID_BFG }],
  gog: [{ id: GOGAPP_ID }, { id: GOGAPP_ID_BFG }],
  xbox: [{ id: XBOXAPP_ID }],
};

// Information for setting executable and variables based on game store version
const EXEC_CLASSIC = "Doom3.exe";
const EXEC_BFG = "Doom3BFG.exe";
const EXEC_XBOX = "gamelaunchhelper.exe";
let GAME_VERSION = '';
const CLASSIC = 'classic';
const BFG = 'bfg';
const XBOX = 'xbox';

// Information for installers, modtypes, and tools
//const USER_HOME = util.getVortexPath("home");
//const LOCALAPPDATA = util.getVortexPath("localAppData");
//const DOCUMENTS =  util.getVortexPath("documents");

const BASE_ID = `${GAME_ID}-base`;
const BASE_ID_BFG = `${GAME_ID_BFG}-base`;
const BASE_NAME = '"base" Data';
const BASE_PATH = 'base';

const D3XP_ID = `${GAME_ID}-d3xp`;
const D3XP_NAME = "d3xp (RoE) Folder";
const D3XP_PATH = "d3xp";

const D3LE_ID = `${GAME_ID}-d3le`;
const D3LE_NAME = "d3le (Lost Mission) Folder";
const D3LE_PATH = "d3le";

const ROOT_ID = `${GAME_ID}-binaries`;
const ROOT_ID_BFG = `${GAME_ID_BFG}-root`;
const ROOT_NAME = 'Binaries / Root Folder';
const ROOT_FILE = 'base';

//Files used to trigger root installer
const WOMD_FILE = "womd_readme.txt"; //Weapon of Mars Destruction mod readme file
const D3HDP_FILE = "d3hdpack"; //Doom 3 HD Pack mod folder
const PHOBOS_FILE = 'tfphobos'; //Phobos mod folder
const ARL_FILE = 'arl'; //ARL mod folder
const REDUX_FILE = 'redux 20th anniversary edition rc1'; //Redux mod folder
const REDUX_DHEWM3_FILE = 'installation'; //Redux-Dhewm3 patch mod folder

const ROOT_FILES = [BASE_PATH, D3XP_PATH, D3LE_PATH, PHOBOS_FILE, WOMD_FILE, D3HDP_FILE, ARL_FILE, REDUX_FILE, REDUX_DHEWM3_FILE]; //<-- Add file/folder names here to get mods to root folder
const MANUAL_INTERVENTION_FILES = [WOMD_FILE, D3HDP_FILE, ARL_FILE, REDUX_FILE, REDUX_DHEWM3_FILE]; //<-- These require the user to do manual file manipulation - trigger notification when installing
const ROOT_FOLDERS_BFG = ['base'];

const DHEWM3_ID = `${GAME_ID}-dhewm3`;
const DHEWM3_NAME = "Dhewm3";
const DHEWM3_EXEC = "dhewm3.exe";
const DHEWM3_ARC_NAME = 'dhewm3-1.5.4_win32.zip';
const DHEWM3_URL_MAIN = `https://api.github.com/repos/dhewm/dhewm3`;
const DHEWM3_FILE = DHEWM3_EXEC; // <-- CASE SENSITIVE! Must match name exactly or downloader will download the file again.
const REQUIREMENTS = [
  { //Dhewm3
    archiveFileName: DHEWM3_ARC_NAME,
    modType: DHEWM3_ID,
    assemblyFileName: DHEWM3_FILE,
    userFacingName: DHEWM3_NAME,
    githubUrl: DHEWM3_URL_MAIN,
    findMod: (api) => findModByFile(api, DHEWM3_ID, DHEWM3_FILE),
    findDownloadId: (api) => findDownloadIdByFile(api, DHEWM3_ARC_NAME),
    fileArchivePattern: new RegExp(/^dhewm3-(\d+\.\d+\.\d+)_win32/, 'i'),
    resolveVersion: (api) => resolveVersionByPattern(api, REQUIREMENTS[0]),
  },
];

const MOD_PATH_DEFAULT = BASE_PATH;
const MOD_PATH_DEFAULT_BFG = ".";
const REQ_FILE = ROOT_FILE;
const PARAMETERS_STRING = "+disconnect +set com_allowconsole 1 +set com_skipintro 1";
const PARAMETERS = [PARAMETERS_STRING];
const PARAMETERS_STRING_BFG = "+set com_allowconsole 1 +set com_skipintrovideos 1";
const PARAMETERS_STRING_BFG2 = "+set fs_resourceLoadPriority 0";
const PARAMETERS_BFG = [PARAMETERS_STRING_BFG, PARAMETERS_STRING_BFG2];
const IGNORE_DEPLOY = [path.join('**', 'readme.txt'), path.join('**', 'README.txt'), path.join('**', 'ReadMe.txt'), path.join('**', 'Readme.txt')];
const IGNORE_CONFLICTS = [path.join('**', 'readme.txt'), path.join('**', 'README.txt'), path.join('**', 'ReadMe.txt'), path.join('**', 'Readme.txt')];

// Filled in from data above
const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "logo": `${GAME_ID}.jpg`,
    "mergeMods": true,
    "requiresCleanup": true,
    "parameters": PARAMETERS,
    "modPath": MOD_PATH_DEFAULT,
    "modPathIsRelative": true,
    "requiredFiles": [
      REQ_FILE
    ],
    "details": {
      "steamAppId": +STEAMAPP_ID,
      "gogAppId": GOGAPP_ID,
      "xboxAppId": XBOXAPP_ID,
      "ignoreDeploy": IGNORE_DEPLOY,
      "ignoreConflicts": IGNORE_CONFLICTS,
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID,
      "GogAPPId": GOGAPP_ID,
      "XboxAppId": XBOXAPP_ID,
    }
  },
  "modTypes": [
    {
      "id": ROOT_ID,
      "name": ROOT_NAME,
      "priority": "high",
      "targetPath": "{gamePath}"
    },
    {
      "id": BASE_ID,
      "name": BASE_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', BASE_PATH)
    },
    {
      "id": D3XP_ID,
      "name": D3XP_NAME,
      "priority": "high",
      "targetPath": `{gamePath}//${D3XP_PATH}`
    },
    {
      "id": D3LE_ID,
      "name": D3LE_NAME,
      "priority": "high",
      "targetPath": `{gamePath}//${D3LE_PATH}`
    },
    {
      "id": DHEWM3_ID,
      "name": DHEWM3_NAME,
      "priority": "low",
      "targetPath": `{gamePath}`
    },
  ],
};

const specBfg = {
  "game": {
    "id": GAME_ID_BFG,
    "name": GAME_NAME_BFG,
    "shortName": GAME_NAME_SHORT_BFG,
    "logo": `${GAME_ID_BFG}.jpg`,
    "mergeMods": true,
    "requiresCleanup": true,
    "parameters": PARAMETERS_BFG,
    "modPath": MOD_PATH_DEFAULT_BFG,
    "modPathIsRelative": true,
    "requiredFiles": [
      REQ_FILE
    ],
    "details": {
      "steamAppId": +STEAMAPP_ID_BFG,
      "gogAppId": GOGAPP_ID_BFG,
      "xboxAppId": XBOXAPP_ID_BFG,
      "nexusPageId": GAME_ID,
      "compatibleDownloads": [GAME_ID],
      "ignoreDeploy": IGNORE_DEPLOY,
      "ignoreConflicts": IGNORE_CONFLICTS,
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID_BFG,
      "gogAPPId": GOGAPP_ID_BFG,
      "XboxAppId": XBOXAPP_ID_BFG,
    }
  },
  "modTypes": [
    {
      "id": ROOT_ID_BFG,
      "name": "Binaries / Root Folder",
      "priority": "high",
      "targetPath": "{gamePath}"
    },
    {
      "id": BASE_ID_BFG,
      "name": BASE_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', BASE_PATH)
    },
  ],
  "discovery": {
    "ids": [
      STEAMAPP_ID_BFG,
      GOGAPP_ID_BFG,
      XBOXAPP_ID_BFG,
    ],
    "names": []
  }
};

//3rd party tools and launchers
const toolsBfg = [
  {
    id: `${GAME_ID_BFG}-customlaunch`,
    name: `Custom Launch`,
    logo: `exec.png`,
    executable: () => EXEC_BFG,
    requiredFiles: [EXEC_BFG],
    detach: true,
    relative: true,
    exclusive: true,
    shell: true,
    //defaultPrimary: true,
    parameters: PARAMETERS_BFG,
  }, //*/
  {
    id: `${GAME_ID_BFG}-customlaunchxbox`,
    name: `Custom Launch`,
    logo: `exec.png`,
    executable: () => EXEC_XBOX,
    requiredFiles: [EXEC_XBOX],
    detach: true,
    relative: true,
    exclusive: true,
    shell: true,
    defaultPrimary: true,
    parameters: PARAMETERS_BFG,
  }, //*/
];

// BASIC FUNCTIONS ///////////////////////////////////////////////////////////////

//Set mod type priorities
function modTypePriority(priority) {
  return {
    high: 25,
    low: 75,
  }[priority];
}

//Convert string placeholders to actual paths
function pathPattern(api, game, pattern) {
  try{
    var _a;
    return template(pattern, {
      gamePath: (_a = api.getState().settings.gameMode.discovered[game.id]) === null || _a === void 0 ? void 0 : _a.path,
      documents: util.getVortexPath('documents'),
      localAppData: util.getVortexPath('localAppData'),
      appData: util.getVortexPath('appData'),
    });
  }
  catch(err){
    api.showErrorNotification('Failed to locate executable. Please launch the game at least once.', err);
  }
}

//Get the executable
function getExecutable(discoveryPath) {
  const isCorrectExec = (exec) => {
    try {
      fs.statSync(path.join(discoveryPath, exec));
      return true;
    }
    catch (err) {
      return false;
    }
  };
  if (isCorrectExec(EXEC_XBOX)) {
    GAME_VERSION = XBOX;
    return EXEC_XBOX;
  };
  if (isCorrectExec(EXEC_CLASSIC)) {
    GAME_VERSION = CLASSIC;
    return EXEC_CLASSIC;
  };
  if (isCorrectExec(EXEC_BFG)) {
    GAME_VERSION = BFG;
    return EXEC_BFG;
  };
  return EXEC_CLASSIC;
}

//Get the executable - BFG Edition
function getExecutableBfg(discoveryPath) {
  const isCorrectExec = (exec) => {
    try {
      fs.statSync(path.join(discoveryPath, exec));
      return true;
    }
    catch (err) {
      return false;
    }
  };
  if (isCorrectExec(EXEC_XBOX)) {
    GAME_VERSION = XBOX;
    return EXEC_XBOX;
  };
  if (isCorrectExec(EXEC_BFG)) {
    GAME_VERSION = BFG;
    return EXEC_BFG;
  };
  return EXEC_BFG;
}

//Get the  store version
async function getStoreVersion(discoveryPath) {
  const isCorrectExec = (exec) => {
    try {
      fs.statSync(path.join(discoveryPath, exec));
      return true;
    }
    catch (err) {
      return false;
    }
  };
  if (isCorrectExec(EXEC_XBOX)) {
    return XBOX;
  };
  if (isCorrectExec(EXEC_CLASSIC)) {
    return CLASSIC;
  };
  if (isCorrectExec(EXEC_BFG)) {
    return BFG;
  };
  return CLASSIC;
}

//Get the  store version - BFG Edition
async function getStoreVersionBfg(discoveryPath) {
  const isCorrectExec = (exec) => {
    try {
      fs.statSync(path.join(discoveryPath, exec));
      return true;
    }
    catch (err) {
      return false;
    }
  };
  if (isCorrectExec(EXEC_XBOX)) {
    return XBOX;
  };
  if (isCorrectExec(EXEC_BFG)) {
    return BFG;
  };
  return BFG;
}

//Set mod path
function makeGetModPath(api, gameSpec) {
  return () => gameSpec.game.modPathIsRelative !== false
    ? gameSpec.game.modPath || '.'
    : pathPattern(api, gameSpec.game, gameSpec.game.modPath);
}

//Find game installation directory
function makeFindGame(api, gameSpec) {
  return () => util.GameStoreHelper.findByAppId(gameSpec.discovery.ids)
    .then((game) => game.gamePath);
}

//Set launcher requirements
async function requiresLauncher(gamePath, store) {
  if (store === 'xbox') {
    return Promise.resolve({
      launcher: 'xbox',
      addInfo: {
        appId: XBOXAPP_ID,
        parameters: [{ appExecName: XBOXEXECNAME }],
      },
    });
  }
  /*if (store === 'steam') {
    return Promise.resolve({
        launcher: 'steam'
    });
  } //*/
  return Promise.resolve(undefined);
}

//Set launcher requirements - BFG Edition
async function requiresLauncherBfg(gamePath, store) {
  if (store === 'xbox') {
    return Promise.resolve({
      launcher: 'xbox',
      addInfo: {
        appId: XBOXAPP_ID_BFG,
        parameters: [{ appExecName: XBOXEXECNAME_BFG }],
      },
    });
  } //*/
  /*if (store === 'steam') {
    return Promise.resolve({
        launcher: 'steam'
    });
  } //*/
  return Promise.resolve(undefined);
}

// AUTOMATIC MOD DOWNLOADERS ///////////////////////////////////////////////////

//Check if Dhewm3 is installed
function isDhewm3Installed(api) {
  const state = api.getState();
  const mods = state.persistent.mods[GAME_ID] || {};
  return Object.keys(mods).some(id => mods[id]?.type === DHEWM3_ID);
}

async function onCheckModVersion(api, gameId, mods, forced) {
  if (GAME_VERSION !== CLASSIC) {
    return;
  }
  try {
    await testRequirementVersion(api, REQUIREMENTS[0]);
  } catch (err) {
    log('warn', 'failed to test requirement version', err);
  }
}

async function checkForDhewm3(api) {
  const mod = await REQUIREMENTS[0].findMod(api);
  return mod !== undefined;
}

// MOD INSTALLER FUNCTIONS ///////////////////////////////////////////////////

//Installer test for Dhewm3
function testDhewm3(files, gameId) {
  const isMod = files.some(file => (path.basename(file).toLowerCase() === DHEWM3_EXEC));
  let supported = (gameId === spec.game.id) && isMod;

  // Test for a mod installer.
  if (supported && files.find(file =>
    (path.basename(file).toLowerCase() === 'moduleconfig.xml') &&
    (path.basename(path.dirname(file)).toLowerCase() === 'fomod'))) {
    supported = false;
  }

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install Dhewm3
function installDhewm3(files) {
  const modFile = files.find(file => path.basename(file).toLowerCase() === DHEWM3_EXEC);
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: DHEWM3_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep)))
  );
  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

//Installer test for Root files
function testRoot(files, gameId) {
  const isMod = files.some(file => ROOT_FILES.includes(path.basename(file).toLowerCase()));
  let supported = (gameId === spec.game.id) && isMod;

  // Test for a mod installer.
  if (supported && files.find(file =>
    (path.basename(file).toLowerCase() === 'moduleconfig.xml') &&
    (path.basename(path.dirname(file)).toLowerCase() === 'fomod'))) {
    supported = false;
  }

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install Root files
function installRoot(api, files, fileName) {
  const modFile = files.find(file => ROOT_FILES.includes(path.basename(file).toLowerCase()));
  const idx = modFile.indexOf(`${path.basename(modFile)}${path.sep}`);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: ROOT_ID };

  if (MANUAL_INTERVENTION_FILES.includes(path.basename(modFile).toLowerCase())) {
    manualManipulationNotify(api, fileName);
  }

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep)))
  );
  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

function manualManipulationNotify(api, fileName) {
  const state = api.getState();
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  const MOD_NAME = path.basename(fileName).replace(/(.installing)*(.zip)*(.rar)*(.7z)*/gi, '');
  const NOTIF_ID = `${GAME_ID}-manualmanipulation-${MOD_NAME}`;
  const MESSAGE = 'Manual File/Folder Manipulation Required';
  api.sendNotification({
    id: NOTIF_ID,
    type: 'warning',
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', MESSAGE, {
            text: `You've just installed a mod with a folder structure that requires manual file/folder manipulation to install properly.\n`
              + `\n`
              + `Mod: ${MOD_NAME}.\n`
              + `\n`
              + `Use the button below to open the Staging Folder and manually manipulate files and/or folders, based on the mod's instructions.\n`
              + `\n`
              + `Check the mod page description or a readme file for installation instructions. You can use the "Open Mod Page" button below (only for mods with a Nexus page). This notification will remain active after opening the mod page.\n`
              + `\n`
          }, [
            { label: `Open Mod Page`, action: () => {
              const mods = util.getSafe(api.store.getState(), ['persistent', 'mods', spec.game.id], {});
              const modMatch = Object.values(mods).find(mod => (mod.installationPath === MOD_NAME));
              //log('warn', `Found ${modMatch?.id} for ${MOD_NAME}`);
              let PAGE = ``;
              if (modMatch) {
                const MOD_ID = modMatch.attributes.modId;
                PAGE = `${MOD_ID}?tab=description`;
              }
              const MOD_PAGE_URL = `https://www.nexusmods.com/${GAME_ID}/mods/${PAGE}`;
              util.opn(MOD_PAGE_URL).catch(err => undefined);
              //dismiss();
            }}, //*/
            { label: `Open Staging Folder`, action: () => {
              util.opn(path.join(STAGING_FOLDER, MOD_NAME)).catch(err => undefined);
              dismiss();
            }}, //*/
            { label: 'Dismiss', action: () => dismiss() },
            { label: 'Never Show Again', action: () => {
              api.suppressNotification(NOTIF_ID);
              dismiss();
            }},
          ]);
        },
      },
    ],
  });
}

// MOD INSTALLER FUNCTIONS - BFG EDITION ///////////////////////////////////////////////////

//Installer test for Root folder files
function testRootBfg(files, gameId) {
  const isMod = files.some(file => ROOT_FOLDERS_BFG.includes(path.basename(file)));
  let supported = (gameId === specBfg.game.id) && isMod;

  // Test for a mod installer.
  if (supported && files.find(file =>
    (path.basename(file).toLowerCase() === 'moduleconfig.xml') &&
    (path.basename(path.dirname(file)).toLowerCase() === 'fomod'))) {
    supported = false;
  }

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install Root folder files
function installRootBfg(files) {
  const modFile = files.find(file => ROOT_FOLDERS_BFG.includes(path.basename(file)));
  const ROOT_IDX = `${path.basename(modFile)}${path.sep}`
  const idx = modFile.indexOf(ROOT_IDX);
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: ROOT_ID_BFG };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
    ((file.indexOf(rootPath) !== -1) && (!file.endsWith(path.sep)))
  );
  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(file.substr(idx)),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

// MAIN FUNCTIONS ///////////////////////////////////////////////////////////////

//Notify User of Setup instructions
function setupNotify(api) {
  if (GAME_VERSION === XBOX) {
    const NOTIF_ID = `${GAME_ID}-xbox-notification`;
    api.sendNotification({
      id: 'xbox-notification-doom3',
      type: 'warning',
      message: 'Xbox Version Detected',
      allowSuppress: true,
      actions: [
        {
          title: 'More',
          action: (dismiss) => {
            api.showDialog('question', 'Xbox Version Detected', {
              text: 'Vortex detected that you are using the Xbox version of Doom 3. This version of Doom 3 is the 64-bit "BFG Edition".\n'
                  + 'Please ensure the mods you install are intended for the BFG version of Doom 3. Mods intended for the Classic version will not work.\n'
                  + '\n'
            }, [
              { label: 'Acknowledge', action: () => dismiss() },
              {
                label: 'Never Show Again', action: () => {
                  api.suppressNotification(NOTIF_ID);
                  dismiss();
                }
              },
            ]);
          },
        },
      ],
    });
  }
  if (GAME_VERSION === BFG) {
    const NOTIF_ID = `${GAME_ID}-bfg-notification`;
    api.sendNotification({
      id: 'bfg-notification-doom3',
      type: 'warning',
      message: 'BFG Version Detected',
      allowSuppress: true,
      actions: [
        {
          title: 'More',
          action: (dismiss) => {
            api.showDialog('question', 'BFG Version Detected', {
              text: 'Vortex detected that you are using the 64-bit "BFG Edition" version of Doom 3.\n'
                  + 'Please ensure the mods you install are intended for the BFG version of Doom 3. Mods intended for the Classic version will not work.\n'
                  + '\n'
            }, [
              { label: 'Acknowledge', action: () => dismiss() },
              {
                label: 'Never Show Again', action: () => {
                  api.suppressNotification(NOTIF_ID);
                  dismiss();
                }
              },
            ]);
          },
        },
      ],
    });
  }
}

async function resolveGameVersion(gamePath) {
  GAME_VERSION = await getStoreVersion(gamePath);
  let version = '0.0.0';
  if (GAME_VERSION === XBOX) {
    try { //try to parse appxmanifest.xml
      const appManifest = await fs.readFileAsync(path.join(gamePath, APPMANIFEST_FILE), 'utf8');
      const parsed = await parseStringPromise(appManifest);
      version = parsed?.Package?.Identity?.[0]?.$?.Version;
      return Promise.resolve(version);
    } catch (err) {
      log('error', `Could not read appmanifest.xml file to get Xbox game version: ${err}`);
      return Promise.resolve(version);
    }
  }
  if (GAME_VERSION = CLASSIC) { // use exe
    try {
      const exeVersion = require('exe-version');
      version = exeVersion.getProductVersion(path.join(gamePath, EXEC_CLASSIC));
      return Promise.resolve(version); 
    } catch (err) {
      log('error', `Could not read ${EXEC_CLASSIC} file to get Steam game version: ${err}`);
      return Promise.resolve(version);
    }
  }
  if (GAME_VERSION = BFG) { // use exe
    try {
      const exeVersion = require('exe-version');
      version = exeVersion.getProductVersion(path.join(gamePath, EXEC_BFG));
      return Promise.resolve(version); 
    } catch (err) {
      log('error', `Could not read ${EXEC_BFG} file to get Steam game version: ${err}`);
      return Promise.resolve(version);
    }
  }
}

async function resolveGameVersionBfg(gamePath) {
  GAME_VERSION = await getStoreVersion(gamePath);
  let version = '0.0.0';
  if (GAME_VERSION === XBOX) {
    try { //try to parse appxmanifest.xml
      const appManifest = await fs.readFileAsync(path.join(gamePath, APPMANIFEST_FILE), 'utf8');
      const parsed = await parseStringPromise(appManifest);
      version = parsed?.Package?.Identity?.[0]?.$?.Version;
      return Promise.resolve(version);
    } catch (err) {
      log('error', `Could not read appmanifest.xml file to get Xbox game version: ${err}`);
      return Promise.resolve(version);
    }
  }
  else { // use exe
    try {
      const exeVersion = require('exe-version');
      version = exeVersion.getProductVersion(path.join(gamePath, EXEC_BFG));
      return Promise.resolve(version); 
    } catch (err) {
      log('error', `Could not read ${EXEC_BFG} file to get Steam game version: ${err}`);
      return Promise.resolve(version);
    }
  }
}

//Setup function
async function setup(discovery, api, gameSpec) {
  const state = api.getState();
  GAME_PATH = discovery.path;
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, GAME_ID);
  GAME_VERSION = getStoreVersion(GAME_PATH);
  await fs.ensureDirWritableAsync(path.join(GAME_PATH, gameSpec.game.modPath));
  await fs.ensureDirWritableAsync(path.join(GAME_PATH, D3XP_PATH));
  await fs.ensureDirWritableAsync(path.join(GAME_PATH, D3LE_PATH));
  if (GAME_VERSION === CLASSIC) {
    const Dhewm3Installed = await checkForDhewm3(api);
    return Dhewm3Installed ? Promise.resolve() : download(api, REQUIREMENTS);
  }
  setupNotify(api);
  return;
}

//Setup function
async function setupBfg(discovery, api, gameSpec) {
  const state = api.getState();
  GAME_PATH_BFG = discovery.path;
  STAGING_FOLDER_BFG = selectors.installPathForGame(state, GAME_ID_BFG);
  DOWNLOAD_FOLDER_BFG = selectors.downloadPathForGame(state, GAME_ID_BFG);
  GAME_VERSION = getStoreVersion(GAME_PATH);
  return fs.ensureDirWritableAsync(path.join(discovery.path, BASE_PATH));
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  //register game
  const game = {
    ...gameSpec.game,
    queryArgs: gameFinderQuery,
    executable: getExecutable,
    queryModPath: makeGetModPath(context.api, gameSpec),
    requiresLauncher: requiresLauncher,
    setup: async (discovery) => await setup(discovery, context.api, gameSpec),
    getGameVersion: resolveGameVersion,
    supportedTools: [
      {
        id: "Dhewm3Launch",
        name: "Launch Dhewm3",
        logo: "dhewm3.png",
        executable: () => DHEWM3_EXEC,
        requiredFiles: [DHEWM3_EXEC],
        detach: true,
        relative: true,
        exclusive: true,
        shell: true,
        defaultPrimary: true,
        parameters: PARAMETERS,
      },
      {
        id: `${GAME_ID}-customlaunch`,
        name: `Custom Launch`,
        logo: `exec.png`,
        executable: () => EXEC_CLASSIC,
        requiredFiles: [EXEC_CLASSIC],
        detach: true,
        relative: true,
        exclusive: true,
        shell: true,
        //defaultPrimary: true,
        parameters: PARAMETERS,
      }, //*/
    ]
  };
  context.registerGame(game);

  //register mod types
  (gameSpec.modTypes || []).forEach((type, idx) => {
    context.registerModType(type.id, modTypePriority(type.priority) + idx, (gameId) => {
      var _a;
      return (gameId === gameSpec.game.id)
        && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    }, (game) => pathPattern(context.api, game, type.targetPath), () => Promise.resolve(false), { name: type.name });
  });
  
  //register mod installers
  context.registerInstaller(DHEWM3_ID, 25, testDhewm3, installDhewm3);
  context.registerInstaller(ROOT_ID, 27, testRoot, (files, fileName) => installRoot(context.api, files, fileName));
  
  //register buttons to open folders
  /*
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Config Folder', () => {
    const openPath = CONFIG_PATH;
    util.opn(openPath).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Saves Folder', () => {
    const openPath = SAVE_PATH;
    util.opn(openPath).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  }); //*/
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'View Changelog', () => {
    const openPath = path.join(__dirname, 'CHANGELOG.md');
    util.opn(openPath).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Downloads Folder', () => {
    const openPath = DOWNLOAD_FOLDER;
    util.opn(openPath).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  });
}

function applyGameBfg(context, gameSpec) {
  //register game
  const game = {
    ...gameSpec.game,
    queryPath: makeFindGame(context.api, gameSpec),
    executable: getExecutableBfg,
    queryModPath: makeGetModPath(context.api, gameSpec),
    requiresLauncher: requiresLauncherBfg,
    setup: async (discovery) => await setupBfg(discovery, context.api, gameSpec),
    getGameVersion: resolveGameVersionBfg,
    supportedTools: toolsBfg,
  };
  context.registerGame(game);

  //register mod types
  (gameSpec.modTypes || []).forEach((type, idx) => {
    context.registerModType(type.id, modTypePriority(type.priority) + idx, (gameId) => {
      var _a;
      return (gameId === gameSpec.game.id)
        && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    }, (game) => pathPattern(context.api, game, type.targetPath), () => Promise.resolve(false), { name: type.name });
  });

  //register mod installers
  context.registerInstaller(ROOT_ID_BFG, 25, testRootBfg, installRootBfg);

  //register buttons to open folders
    /*
    context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Config Folder', () => {
      util.opn(CONFIG_PATH_BFG).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID_BFG;
    });
    context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Saves Folder', () => {
      util.opn(SAVE_PATH_BFG).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID_BFG;
    }); //*/
    context.registerAction('mod-icons', 300, 'open-ext', {}, 'View Changelog', () => {
      const openPath = path.join(__dirname, 'CHANGELOG.md');
      util.opn(openPath).catch(() => null);
      }, () => {
        const state = context.api.getState();
        const gameId = selectors.activeGameId(state);
        return gameId === GAME_ID_BFG;
    });
    context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Downloads Folder', () => {
      const openPath = DOWNLOAD_FOLDER_BFG;
      util.opn(openPath).catch(() => null);
      }, () => {
        const state = context.api.getState();
        const gameId = selectors.activeGameId(state);
        return gameId === GAME_ID_BFG;
    });
}

//Main function
function main(context) {
  applyGame(context, spec);
  applyGameBfg(context, specBfg);
  context.once(() => { //run (once) when Vortex starts up
    context.api.onAsync('check-mods-version', (gameId, mods, forced) => {
      if (gameId !== GAME_ID) return;
      return onCheckModVersion(context.api, gameId, mods, forced);
    }); //*/
  });
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
