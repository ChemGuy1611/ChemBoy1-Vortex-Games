/*//////////////////////////////////////////
Name: DOOM: The Dark Ages Vortex Extension
Structure: 3rd-Party Mod Loader
Author: ChemBoy1
Version: 0.1.3
Date: 2025-05-28
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
const Bluebird = require('bluebird');

//Specify all the information about the game
const STEAMAPP_ID = "3017860";
const XBOXAPP_ID = "BethesdaSoftworks.ProjectTitan";
const XBOXEXECNAME = "Game";
const GAME_ID = "doomthedarkages";
const GAME_NAME = "DOOM: The Dark Ages";
const GAME_NAME_SHORT = "DOOM TDA";
const EXEC = "DOOMTheDarkAges.exe";
const EXEC_LAUNCHER = 'idTechLauncher.exe';
const EXEC_XBOX = 'gamelaunchhelper.exe';
let GAME_PATH = null;
let GAME_VERSION = '';
let STAGING_FOLDER = '';
let DOWNLOAD_FOLDER = '';
const APPMANIFEST_FILE = 'appxmanifest.xml';

//Info for mod types and installers
const USER_HOME = util.getVortexPath("home");
const LOCALAPPDATA = util.getVortexPath("localAppData");
const DOCUMENTS = util.getVortexPath("documents");

const BINARIES_ID = `${GAME_ID}-binaries`;
const BINARIES_NAME = "Binaries / Root Folder";

const INJECTOR_ID = `${GAME_ID}-injector`;
const INJECTOR_NAME = "TDAModInjector";
const INJECTOR_FILE = 'darkagesmodmanager.exe';
const INJ_DL_URL = `https://gamebanana.com`;
const INJ_DLERROR_URL = `https://gamebanana.com`;

const SOUND_ID = `${GAME_ID}-sound`;
const SOUND_NAME = "Sound";
const SOUND_PATH = path.join('base', 'sound', 'soundbanks', 'pc');
const SOUND_EXTS = ['.snd', '.pck'];

const CONFIG_ID = `${GAME_ID}-config`;
const CONFIG_NAME = "Config";
let CONFIG_PATH = 'base';
//const CONFIG_PATH_STEAM = path.join(USER_HOME, 'Saved Games', 'id Software', 'DOOMTheDarkAges', 'base');
//const CONFIG_PATH_XBOX = path.join(USER_HOME, 'Saved Games', 'id Software', 'DOOMTheDarkAges', 'base');
const CONFIG_EXTS = [".cfg"];
const AUTOEXEC_CFG_FILE = "autoexec.cfg";
//const CONFIG_INSTALL_PATH = path.join('base');

const SAVE_ID = `${GAME_ID}-save`;
const SAVE_NAME = "Saves";
let SAVE_PATH = '';
const SAVE_PATH_STEAM = path.join(USER_HOME, 'Saved Games', 'id Software', 'DOOMTheDarkAges');
const SAVE_PATH_XBOX = path.join(LOCALAPPDATA, "Packages", `${XBOXAPP_ID}_3275kfvn8vcwc`, "SystemAppData", "wgs");
const SAVE_EXT = ".sav";

const MODS_ID = `${GAME_ID}-mods`;
const MODS_NAME = "Injector Mod";
const MODS_PATH = path.join("Mods");

const MOD_PATH_DEFAULT = MODS_PATH;
const REQ_FILE = 'base';
const PARAMETERS = [`+com_skipIntroVideo 1`, `+exec ${AUTOEXEC_CFG_FILE}`];

// Filled in from data above
const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "shortName": GAME_NAME_SHORT,
    "executable": EXEC_LAUNCHER,
    "parameters": [`+com_skipIntroVideo 1 +exec ${AUTOEXEC_CFG_FILE}`],
    "logo": `${GAME_ID}.jpg`,
    "mergeMods": true,
    "requiresCleanup": true,
    "modPath": MOD_PATH_DEFAULT,
    "modPathIsRelative": true,
    "requiredFiles": [
      REQ_FILE,
    ],
    "details": {
      "steamAppId": +STEAMAPP_ID,
      "xboxAppId": XBOXAPP_ID,
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID,
      "XboxAPPId": XBOXAPP_ID
    }
  },
  "modTypes": [
    {
      "id": MODS_ID,
      "name": MODS_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${MODS_PATH}`
    },
    {
      "id": CONFIG_ID,
      "name": CONFIG_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${CONFIG_PATH}`
    },
    {
      "id": BINARIES_ID,
      "name": BINARIES_NAME,
      "priority": "high",
      "targetPath": "{gamePath}"
    },
    {
      "id": SOUND_ID,
      "name": SOUND_NAME,
      "priority": "high",
      "targetPath": `{gamePath}\\${SOUND_PATH}`
    },
    {
      "id": INJECTOR_ID,
      "name": INJECTOR_NAME,
      "priority": "low",
      "targetPath": "{gamePath}"
    },
  ],
  "discovery": {
    "ids": [
      STEAMAPP_ID,
      XBOXAPP_ID,
    ],
    "names": []
  }
};

//launchers and 3rd party tools
const tools = [
  {
    id: INJECTOR_ID,
    name: INJECTOR_NAME,
    logo: "doom.png",
    executable: () => INJECTOR_FILE,
    requiredFiles: [INJECTOR_FILE],
    detach: true,
    relative: true,
    exclusive: true,
    parameters: []
  }, //*/
  {
    id: `${GAME_ID}-customlaunch`,
    name: `Custom Launch`,
    logo: `exec.png`,
    executable: () => EXEC_LAUNCHER,
    requiredFiles: [EXEC_LAUNCHER],
    detach: true,
    relative: true,
    exclusive: true,
    shell: true,
    //defaultPrimary: true,
    parameters: [`+com_skipIntroVideo 1 +exec ${AUTOEXEC_CFG_FILE}`],
  }, //*/
];

// BASIC FUNCTIONS ///////////////////////////////////////////////////////////////

//set mod type priorities
function modTypePriority(priority) {
  return {
    high: 25,
    low: 75,
  }[priority];
}

//Replace folder path string placeholders with correct folder paths
function pathPattern(api, game, pattern) {
  var _a;
  return template(pattern, {
    gamePath: (_a = api.getState().settings.gameMode.discovered[game.id]) === null || _a === void 0 ? void 0 : _a.path,
    documents: util.getVortexPath('documents'),
    localAppData: util.getVortexPath('localAppData'),
    appData: util.getVortexPath('appData'),
  });
}

//Set the mod path for the game
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

async function requiresLauncher(gamePath, store) {
  if (store === 'xbox') {
    return Promise.resolve({
      launcher: 'xbox',
      addInfo: {
        appId: XBOXAPP_ID,
        parameters: [{ appExecName: XBOXEXECNAME}],
      },
    });
  } //*/
  if (store === 'steam') {
    return Promise.resolve({
      launcher: 'steam',
      addInfo: {
        parameters: [`+com_skipIntroVideo 1 +exec ${AUTOEXEC_CFG_FILE}`],
      },
    });
  } //*/
  return Promise.resolve(undefined);
}

//Get correct executable, add to required files, set paths for mod types
function setGameVersion(discoveryPath) {
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
    GAME_VERSION = 'xbox';
    let USERID_FOLDER = "";
    try {
      const SAVE_ARRAY = fs.readdirSync(SAVE_PATH_XBOX);
      USERID_FOLDER = SAVE_ARRAY.find((element) => 
      ((element))
       );
    } catch(err) {
      USERID_FOLDER = "";
    }
    if (USERID_FOLDER === undefined) {
      USERID_FOLDER = "";
    }
    SAVE_PATH = path.join(SAVE_PATH_XBOX, USERID_FOLDER);
    return GAME_VERSION;
  }
  else { 
    GAME_VERSION = 'steam';
    let USERID_FOLDER = "";
    try {
      const SAVE_ARRAY = fs.readdirSync(SAVE_PATH_DEFAULT);
      USERID_FOLDER = SAVE_ARRAY.find((element) => 
      ((/[a-z]/i.test(element) === false))
       );
    } catch(err) {
      USERID_FOLDER = "";
    }
    if (USERID_FOLDER === undefined) {
      USERID_FOLDER = "";
    }
    SAVE_PATH = path.join(SAVE_PATH_STEAM, USERID_FOLDER);
    return GAME_VERSION;
  };
}

const getDiscoveryPath = (api) => {
  const state = api.getState();
  const discovery = util.getSafe(state, [`settings`, `gameMode`, `discovered`, GAME_ID], {});
  return discovery === null || discovery === void 0 ? void 0 : discovery.path;
};

async function purge(api) {
  return new Promise((resolve, reject) => api.events.emit('purge-mods', true, (err) => err ? reject(err) : resolve()));
}
async function deploy(api) {
  return new Promise((resolve, reject) => api.events.emit('deploy-mods', (err) => err ? reject(err) : resolve()));
}


// AUTO-DOWNLOADER FUNCTIONS ///////////////////////////////////////////////////

//Check if mod injector is installed
function isTDAModInjectorInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === INJECTOR_ID);
}

//Function to auto-download Mod Loader
async function downloadTDAModInjector(api, gameSpec) {
  let modLoaderInstalled = isTDAModInjectorInstalled(api, gameSpec);
  if (!modLoaderInstalled) {
    const NOTIF_ID = `${INJECTOR_ID}-installing`;
    api.sendNotification({ //notification indicating install process
      id: NOTIF_ID,
      message: `Installing ${INJECTOR_NAME}`,
      type: 'activity',
      noDismiss: true,
      allowSuppress: false,
    });
    try { //Download the mod
      const dlInfo = {
        game: gameSpec.game.id,
        name: INJECTOR_NAME,
      };
      const URL = INJ_DL_URL;
      const dlId = await util.toPromise(cb =>
        api.events.emit('start-download', [URL], dlInfo, undefined, cb, undefined, { allowInstall: false }));
      const modId = await util.toPromise(cb =>
        api.events.emit('start-install-download', dlId, { allowAutoEnable: false }, cb));
      const profileId = selectors.lastActiveProfileForGame(api.getState(), gameSpec.game.id);
      const batched = [
        actions.setModsEnabled(api, profileId, [modId], true, {
          allowAutoDeploy: true,
          installed: true,
        }),
        actions.setModType(gameSpec.game.id, modId, INJECTOR_ID), // Set the modType
      ];
      util.batchDispatch(api.store, batched); // Will dispatch both actions.
    } catch (err) { //Show the user the download page if the download/install process fails
      const errPage = INJ_DLERROR_URL;
      api.showErrorNotification(`Failed to download/install ${INJECTOR_NAME}. You must download manually.`, err, { allowReport: false });
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
}

// MOD INSTALLER FUNCTIONS ///////////////////////////////////////////////////

//Installer test for TDAModInjector
function testInjector(files, gameId) {
  const isMod = files.some(file => (path.basename(file).toLowerCase() === INJECTOR_FILE));
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

//Installer install TDAModInjector files
function installInjector(files) {
  const modFile = files.find(file => (path.basename(file).toLowerCase() === INJECTOR_FILE));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: INJECTOR_ID };

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

//Test for sound files
function testSound(files, gameId) {
  const isMod = files.some(file => SOUND_EXTS.includes(path.extname(file).toLowerCase()));
  let supported = (gameId === spec.game.id) && isMod;

  // Test for a mod installer
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

//Install sound files
function installSound(files) {
  const modFile = files.find(file => SOUND_EXTS.includes(path.extname(file).toLowerCase()));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: SOUND_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
  ((file.indexOf(rootPath) !== -1) &&
    (!file.endsWith(path.sep))));

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


//Test for config files
function testConfig(files, gameId) {
  const isMod = files.some(file => CONFIG_EXTS.includes(path.extname(file).toLowerCase()));
  let supported = (gameId === spec.game.id) && isMod;

  // Test for a mod installer
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

//Install config files
function installConfig(files) {
  const modFile = files.find(file => CONFIG_EXTS.includes(path.extname(file).toLowerCase()));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: CONFIG_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
  ((file.indexOf(rootPath) !== -1) &&
    (!file.endsWith(path.sep))));

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

//Test for save files
function testSave(files, gameId) {
  const isMod = files.some(file => (path.extname(file).toLowerCase() === SAVE_EXT));
  let supported = (gameId === spec.game.id) && isMod;

  // Test for a mod installer
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

//Install save files
function installSave(files) {
  const modFile = files.find(file => (path.extname(file).toLowerCase() === SAVE_EXT));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: SAVE_ID };

  // Remove directories and anything that isn't in the rootPath.
  const filtered = files.filter(file =>
  ((file.indexOf(rootPath) !== -1) &&
    (!file.endsWith(path.sep)))
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

//test for zips
async function testZipContent(files, gameId) {
  let supported = (gameId === spec.game.id);

  // Test for a mod installer.
  if (supported && files.find(file =>
    (path.basename(file).toLowerCase() === 'moduleconfig.xml') &&
    (path.basename(path.dirname(file)).toLowerCase() === 'fomod'))) {
    supported = false;
  }

  return Promise.resolve({
    supported,
    requiredFiles: []
  });
}

//Install zips
async function installZipContent(files, destinationPath) {
  const zipFiles = files.filter(file => ['.zip', '.7z', '.rar'].includes(path.extname(file)));
  if (zipFiles.length > 0) { // If it's a double zip, we don't need to repack. 
    const instructions = zipFiles.map(file => {
      return {
        type: 'copy',
        source: file,
        destination: path.basename(file),
      }
    });
    return Promise.resolve({ instructions });
  }
  else { // Repack the ZIP
    const szip = new util.SevenZip();
    const archiveName = path.basename(destinationPath, '.installing') + '.zip';
    const archivePath = path.join(destinationPath, archiveName);
    const rootRelPaths = await fs.readdirAsync(destinationPath);
    await szip.add(archivePath, rootRelPaths.map(relPath => path.join(destinationPath, relPath)), { raw: ['-r'] });
    const instructions = [{
      type: 'copy',
      source: archiveName,
      destination: path.basename(archivePath),
    }];
    return Promise.resolve({ instructions });
  }
}

//convert installer functions to Bluebird promises
function toBlue(func) {
  return (...args) => Bluebird.Promise.resolve(func(...args));
}

//Test Fallback installer for binaries folder
function testBinaries(files, gameId) {
  let supported = (gameId === spec.game.id);

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

//Fallback installer for binaries folder
function installBinaries(files) {
  const setModTypeInstruction = { type: 'setmodtype', value: BINARIES_ID };
  // Remove empty directories
  const filtered = files.filter(file =>
    (!file.endsWith(path.sep))
  );

  const instructions = filtered.map(file => {
    return {
      type: 'copy',
      source: file,
      destination: path.join(file),
    };
  });
  instructions.push(setModTypeInstruction);
  return Promise.resolve({ instructions });
}

// MAIN FUNCTIONS ///////////////////////////////////////////////////////////////

//Notify User to run ATK after deployment
function deployNotify(api) {
  const NOTIF_ID = `${GAME_ID}-deploy-notification`;
  const MOD_NAME = INJECTOR_NAME;
  const MESSAGE = `Run ${MOD_NAME}`;
  api.sendNotification({
    id: NOTIF_ID,
    type: 'warning',
    message: MESSAGE,
    allowSuppress: true,
    actions: [
      {
        title: 'Run Injector',
        action: (dismiss) => {
          runInjector(api);
          dismiss();
        },
      },
      {
        title: 'More',
        action: (dismiss) => {
          api.showDialog('question', MESSAGE, {
            text: `After installing new mods, you must run ${MOD_NAME} to install them to the game's data files.\n`
                + `Use the included tool to launch ${MOD_NAME} (button on notification or in "Dashboard" tab).\n`
                + `The process of installing the mods may take a few minutes.\n`
          }, [
            {
              label: 'Run Injector', action: () => {
                runInjector(api);
                dismiss();
              }
            },
            { label: 'Continue', action: () => dismiss() },
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

function runInjector(api) {
  const TOOL_ID = INJECTOR_ID;
  const TOOL_NAME = INJECTOR_NAME;
  const state = api.store.getState();
  const tool = util.getSafe(state, ['settings', 'gameMode', 'discovered', GAME_ID, 'tools', TOOL_ID], undefined);

  try {
    const TOOL_PATH = tool.path;
    if (TOOL_PATH !== undefined) {
      return api.runExecutable(TOOL_PATH, [], { suggestDeploy: false })
        .catch(err => api.showErrorNotification(`Failed to run ${TOOL_NAME}`, err,
          { allowReport: ['EPERM', 'EACCESS', 'ENOENT'].indexOf(err.code) !== -1 })
        );
    }
    else {
      return api.showErrorNotification(`Failed to run ${TOOL_NAME}`, `Path to ${TOOL_NAME} executable could not be found. Ensure ${TOOL_NAME} is installed through Vortex.`);
    }
  } catch (err) {
    return api.showErrorNotification(`Failed to run ${TOOL_NAME}`, err, { allowReport: ['EPERM', 'EACCESS', 'ENOENT'].indexOf(err.code) !== -1 });
  }
}

async function resolveGameVersion(gamePath) {
  GAME_VERSION = setGameVersion(gamePath);
  let version = '0.0.0';
  if (GAME_VERSION === 'xbox') {
    try { //try to parse appmanifest.xml
      const appManifest = await fs.readFileAsync(path.join(gamePath, APPMANIFEST_FILE), 'utf8');
      const parser = new DOMParser();
      const XML = parser.parseFromString(appManifest, 'text/xml');
      try { //try to get version from appmanifest.xml
        const identity = XML.getElementsByTagName('Identity')[0];
        version = identity.getAttribute('Version');
        return Promise.resolve(version);
      } catch (err) { //could not get version
        log('error', `Could not get version from appmanifest.xml file for Xbox game version: ${err}`);
        return Promise.resolve(version);
      }
    } catch (err) { //mod.manifest could not be read. Try to overwrite with a clean one.
      log('error', `Could not read appmanifest.xml file to get Xbox game version: ${err}`);
      return Promise.resolve(version);
    }
  }
  else { // use DoomTheDarkAges.exe for Steam
    try {
      const exeVersion = require('exe-version');
      version = exeVersion.getProductVersionLocalized(path.join(gamePath, EXEC));
      return Promise.resolve(version); 
    } catch (err) {
      log('error', `Could not read ${EXEC} file to get Steam game version: ${err}`);
      return Promise.resolve(version);
    }
  }
}

//Setup function
async function setup(discovery, api, gameSpec) {
  const state = api.getState();
  GAME_PATH = discovery.path;
  GAME_VERSION = setGameVersion(GAME_PATH);
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, GAME_ID);
  const AUTOEXEC_CFG_PATH = path.join(GAME_PATH, CONFIG_PATH, AUTOEXEC_CFG_FILE);
  try {
    fs.statSync(AUTOEXEC_CFG_PATH);
    //log('warn', `Found ${AUTOEXEC_CFG_FILE}`);
  } catch (err) {
    await fs.writeFileAsync(
      AUTOEXEC_CFG_PATH,
      ``,
      { encoding: "utf8" },
    );
  }
  //await downloadTDAModInjector(api, gameSpec);
  await fs.ensureDirWritableAsync(path.join(GAME_PATH, SOUND_PATH));
  //await fs.ensureDirWritableAsync(path.join(SAVE_PATH));
  return fs.ensureDirWritableAsync(path.join(GAME_PATH, MOD_PATH_DEFAULT));
}

//Let Vortex know about the game
function applyGame(context, gameSpec) {
  //register the game
  const game = {
    ...gameSpec.game,
    queryPath: makeFindGame(context.api, gameSpec),
    queryModPath: makeGetModPath(context.api, gameSpec),
    requiresLauncher: requiresLauncher,
    setup: async (discovery) => await setup(discovery, context.api, gameSpec),
    executable: () => gameSpec.game.executable,
    getGameVersion: resolveGameVersion,
    supportedTools: tools,
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

  /* register mod types explicitly
  context.registerModType(SAVE_ID, 52, 
    (gameId) => {
      var _a;
      return (gameId === GAME_ID) && !!((_a = context.api.getState().settings.gameMode.discovered[gameId]) === null || _a === void 0 ? void 0 : _a.path);
    }, 
    (game) => pathPattern(context.api, game, `{gamePath}\\${SAVE_PATH}`), 
    () => Promise.resolve(false), 
    { name: SAVE_NAME }
  ); //*/

  //register mod installers
  //context.registerInstaller(INJECTOR_ID, 25, testInjector, installInjector); // <-- Disabled until mod loader is available
  context.registerInstaller(SOUND_ID, 27, testSound, installSound);
  context.registerInstaller(CONFIG_ID, 29, testConfig, installConfig);
  //context.registerInstaller(SAVE_ID, 31, testSave, installSave);
  //context.registerInstaller(`${GAME_ID}-zipmod`, 33, toBlue(testZipContent), toBlue(installZipContent)); // <-- Disabled until mod loader is available
  context.registerInstaller(BINARIES_ID, 35, testBinaries, installBinaries); //fallback installer

  //register buttons to open folders
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open autoexec.cfg File', () => {
    GAME_PATH = getDiscoveryPath(context.api);
    const openPath = path.join(GAME_PATH, CONFIG_PATH, AUTOEXEC_CFG_FILE);
    util.opn(openPath).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
    }
  );
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Sounds Folder', () => {
    GAME_PATH = getDiscoveryPath(context.api);
    const openPath = path.join(GAME_PATH, SOUND_PATH);
    util.opn(openPath).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
    }
  );
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Config Folder', () => {
    GAME_PATH = getDiscoveryPath(context.api);
    const openPath = path.join(CONFIG_PATH);
    util.opn(openPath).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Saves Folder', () => {
    GAME_PATH = getDiscoveryPath(context.api);
    const openPath = path.join(SAVE_PATH);
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

//main function
function main(context) {
  applyGame(context, spec);
  context.once(() => { // put code here that should be run (once) when Vortex starts up
    /*context.api.onAsync('did-deploy', async (profileId, deployment) => {
      const LAST_ACTIVE_PROFILE = selectors.lastActiveProfileForGame(context.api.getState(), GAME_ID);
      if (profileId !== LAST_ACTIVE_PROFILE) return;
      return deployNotify(context.api);
    }); //*/
    context.api.onAsync('did-deploy', (profileId) => didDeploy(context.api, profileId));
    context.api.onAsync('did-purge', (profileId) => didPurge(context.api, profileId));
  });
  return true;
}

//*
async function didDeploy(api, profileId) { //run on mod deploy
  const state = api.getState();
  const profile = selectors.profileById(state, profileId);
  const gameId = profile === null || profile === void 0 ? void 0 : profile.gameId;
  if (gameId !== GAME_ID) {
    return Promise.resolve();
  }
  await writeCfgDeploy(api);
  return Promise.resolve();
} //*/

//*
async function didPurge(api, profileId) { //run on mod purge
  const state = api.getState();
  const profile = selectors.profileById(state, profileId);
  const gameId = profile === null || profile === void 0 ? void 0 : profile.gameId;
  if (gameId !== GAME_ID) {
    return Promise.resolve();
  }
  await writeCfgPurge(api);
  return Promise.resolve();
} //*/

//Write autoexec.cfg on deploy
async function writeCfgDeploy(api) {
  GAME_PATH = getDiscoveryPath(api);
  if (GAME_PATH === undefined) {
    return Promise.reject(new util.NotFound('Game not found'));
  }
  const AUTOEXEC_CFG_PATH = path.join(GAME_PATH, CONFIG_PATH, AUTOEXEC_CFG_FILE);
  const CFG_PATH = path.join(GAME_PATH, CONFIG_PATH);

  let EXISTING_CONTENT = await fs.readFileAsync(
    AUTOEXEC_CFG_PATH, 
    { encoding: "utf8", }
  );
  let EXISTING_CONTENT_ARRAY = EXISTING_CONTENT.split("\n");
  EXISTING_CONTENT_ARRAY = EXISTING_CONTENT_ARRAY.filter(line => !line.startsWith('exec'));
  EXISTING_CONTENT_ARRAY = EXISTING_CONTENT_ARRAY.filter(line => (line !== ``));
  EXISTING_CONTENT = EXISTING_CONTENT_ARRAY.join("\n");

  let modFiles = [];
  const CFG_EXT_FILTER = CONFIG_EXTS;
  const CFG_FILE_FILTER = [AUTOEXEC_CFG_FILE, 'candidate.cfg', 'default.cfg', 'disclayout.cfg'];
  try {
    modFiles = await fs.readdirAsync(CFG_PATH);
    modFiles = modFiles.filter(file => CFG_EXT_FILTER.includes(path.extname(file).toLowerCase()));
    modFiles = modFiles.filter(file => !CFG_FILE_FILTER.includes(path.basename(file)));
    modFiles = modFiles.map(file => `exec ${file}`);
  } catch {
    return Promise.reject(new Error('Failed to read Data folder'));
  }
  return fs.writeFileAsync(
    AUTOEXEC_CFG_PATH,
    `${EXISTING_CONTENT + '\n' + modFiles.join('\n')}`,
    { encoding: "utf8" },
  );
} //*/

//Reset autoexec.cfg on purge
async function writeCfgPurge(api) {
  GAME_PATH = getDiscoveryPath(api);
  if (GAME_PATH === undefined) {
    return Promise.reject(new util.NotFound('Game not found'));
  }
  const AUTOEXEC_CFG_PATH = path.join(GAME_PATH, CONFIG_PATH, AUTOEXEC_CFG_FILE);

  let EXISTING_CONTENT = await fs.readFileAsync(
    AUTOEXEC_CFG_PATH, 
    { encoding: "utf8", }
  );
  let EXISTING_CONTENT_ARRAY = EXISTING_CONTENT.split("\n");
  EXISTING_CONTENT_ARRAY = EXISTING_CONTENT_ARRAY.filter(line => !line.startsWith('exec'));
  EXISTING_CONTENT_ARRAY = EXISTING_CONTENT_ARRAY.filter(line => (line !== ``));
  EXISTING_CONTENT = EXISTING_CONTENT_ARRAY.join("\n");

  return fs.writeFileAsync(
    AUTOEXEC_CFG_PATH,
    EXISTING_CONTENT,
    { encoding: "utf8" },
  );
}

//export to Vortex
module.exports = {
  default: main,
};
