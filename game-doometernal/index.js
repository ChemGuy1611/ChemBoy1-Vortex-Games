/*////////////////////////////////////////////////
Name: DOOM Eternal Vortex Extension
Structure: 3rd party mod loader
Author: ChemBoy1
Version: 0.4.0
Date: 2026-07-16
////////////////////////////////////////////////*/
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
const { parseStringPromise } = require('xml2js');

//Specify all the information about the game
const GAME_ID = "doometernal";
const STEAMAPP_ID = "782330";
const XBOXAPP_ID = "BethesdaSoftworks.DOOMEternal-PC";
const XBOXEXECNAME = "Game";
const DISCOVERY_IDS_ACTIVE = [STEAMAPP_ID, XBOXAPP_ID]; // UPDATE THIS WITH ALL VALID IDs
const GAME_NAME = "DOOM Eternal";
const EXEC = path.join('launcher', "idTechLauncher.exe");
const EXEC_ALT = "DOOMEternalx64vk.exe";
const EXEC_XBOX = "gamelaunchhelper.exe";

const INJ_TOOL_ID = "7475"; //GameBanana tool id for EternalModInjector
const INJ_REV = "6.66 Rev 3 N"; //fallback version if the GameBanana API is unreachable
const INJ_DL_ID = "1706519"; //fallback file id if the GameBanana API is unreachable - https://gamebanana.com/tools/7475
const INJ_URL = `https://gamebanana.com/tools/${INJ_TOOL_ID}`;
const INJ_INSTR_URL = `https://gamebanana.com/posts/10737067`;
const INJ_API_FILES_URL = `https://gamebanana.com/apiv11/Tool/${INJ_TOOL_ID}/DownloadPage`;
const INJ_API_UPDATES_URL = `https://gamebanana.com/apiv11/Tool/${INJ_TOOL_ID}/Updates?_nPage=1&_nPerpage=1`;
const INJ_FILE_ATTR = "gamebananaFileId"; //mod attribute used to track the installed GameBanana file id

let GAME_PATH = '';
let STAGING_FOLDER = '';
let DOWNLOAD_FOLDER = '';
let GAME_VERSION = '';
const APPMANIFEST_FILE = 'appxmanifest.xml';

//Info for mod types and installers
const USER_HOME = util.getVortexPath("home");
const LOCALAPPDATA = util.getVortexPath("localAppData");
const DOCUMENTS = util.getVortexPath("documents");

const BINARIES_ID = "doometernal-binaries";
const BINARIES_NAME = "Binaries / Root Folder";

const SANDBOX_ID = "doometernal-sandbox";
const SANDBOX_NAME = "SandBox (Modded Binaries)";
const SANDBOX_PATH = path.join("doomSandBox");

const INJECTOR_ID = "doometernal-injector";
const INJECTOR_NAME = "EternalModInjector";
const INJECTOR_FILE = "eternalmodmanager.exe";
const INJ_DL_URL = `https://gamebanana.com/dl/${INJ_DL_ID}`;

const ROLLBACK_FILE = "doometernalx64vk.exe";
const KTDE_FILE = "keep the dead eternal - readme - install instructions.rtf";
const MEAT_FILE = "xinput1_3.dll";

const CONFIG_PATH = path.join(USER_HOME, 'Saved Games', 'id Software', 'DOOMEternal', 'base');
const SAVE_PATH  = path.join(CONFIG_PATH);

const REQ_FILE = EXEC;
const MOD_PATH_DEFAULT = "Mods";
const PARAMETERS_STRING = '';
const PARAMETERS = [PARAMETERS_STRING];
const IGNORE_CONFLICTS = [path.join('**', 'changelog.txt'), path.join('**', 'readme.txt'), path.join('**', 'README.txt'), path.join('**', 'ReadMe.txt'), path.join('**', 'Readme.txt')];
const IGNORE_DEPLOY = [path.join('**', 'changelog.txt'), path.join('**', 'readme.txt'), path.join('**', 'README.txt'), path.join('**', 'ReadMe.txt'), path.join('**', 'Readme.txt')];

// Filled in from data above
const EXTENSION_URL = "https://www.nexusmods.com/site/mods/865"; //Nexus link to this extension. Used for links
const PCGAMINGWIKI_URL = "https://www.pcgamingwiki.com/wiki/Doom_Eternal";
const spec = {
  "game": {
    "id": GAME_ID,
    "name": GAME_NAME,
    "executable": EXEC,
    "logo": `${GAME_ID}.jpg`,
    "mergeMods": true,
    "requiresCleanup": true,
    "modPath": MOD_PATH_DEFAULT,
    "modPathIsRelative": true,
    "requiredFiles": [
      REQ_FILE
    ],
    "details": {
      "steamAppId": +STEAMAPP_ID,
      "xboxAppId": XBOXAPP_ID,
      "ignoreDeploy": IGNORE_DEPLOY,
      "ignoreConflicts": IGNORE_CONFLICTS,
    },
    "environment": {
      "SteamAPPId": STEAMAPP_ID,
      "XboxAPPId": XBOXAPP_ID
    }
  },
  "modTypes": [
    {
      "id": BINARIES_ID,
      "name": BINARIES_NAME,
      "priority": "high",
      "targetPath": "{gamePath}"
    },
    { //manual assignment only
      "id": SANDBOX_ID,
      "name": SANDBOX_NAME,
      "priority": "high",
      "targetPath": path.join('{gamePath}', SANDBOX_PATH)
    },
    {
      "id": INJECTOR_ID,
      "name": INJECTOR_NAME,
      "priority": "low",
      "targetPath": "{gamePath}"
    },
  ],
  "discovery": {
    "ids": DISCOVERY_IDS_ACTIVE,
    "names": []
  }
};

//launchers and 3rd party tools
const tools = [
  {
    id: "LaunchClassicModdedGame",
    name: "Launch Classic Modded Game",
    logo: "doom.png",
    executable: () => ROLLBACK_FILE,
    requiredFiles: [ROLLBACK_FILE],
    detach: true,
    relative: true,
    exclusive: true,
    //defaultPrimary: true,
    parameters: []
  }, //*/
  {
    id: INJECTOR_ID,
    name: INJECTOR_NAME,
    logo: "eternalmodinjector.png",
    executable: () => INJECTOR_FILE,
    requiredFiles: [INJECTOR_FILE],
    detach: true,
    relative: true,
    exclusive: true,
    parameters: []
  },
];

//set mod type priorities
function isDir(folder, file) {
  const stats = fs.statSync(path.join(folder, file));
  return stats.isDirectory();
}

async function getAllFiles(dirPath) {
  let results = [];
  try {
    const entries = await fs.readdirAsync(dirPath);
    for (const entry of entries) {
      const fullPath = path.join(dirPath, entry);
      const stats = await fs.statAsync(fullPath);
      if (stats.isDirectory()) { // Recursively get files from subdirectories
        const subDirFiles = await getAllFiles(fullPath);
        results = results.concat(subDirFiles);
      } else { // Add file to results
        results.push(fullPath);
      }
    }
  } catch (err) {
    log('warn', `Error reading directory ${dirPath}: ${err.message}`);
  }
  return results;
}

function modTypePriority(priority) {
  return {
    high: 30,
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
              parameters: [{ appExecName: XBOXEXECNAME }],
          },
      });
  } //*/
  if (store === 'steam') {
    return Promise.resolve({
        launcher: 'steam'
    });
  } //*/
  return Promise.resolve(undefined);
}

//Get correct game version
async function setGameVersion(gamePath) {
  if (await statCheckAsync(gamePath, EXEC_XBOX)) {
    GAME_VERSION = 'xbox';
    return GAME_VERSION;
  };

  GAME_VERSION = 'default';
  return GAME_VERSION;
}

//Get correct executable for game version
function getExecutable(discoveryPath) {
  if (statCheckSync(discoveryPath, EXEC_XBOX)) {
    return EXEC_XBOX;
  };

  return EXEC;
}

function statCheckSync(gamePath, file) {
  try {
    fs.statSync(path.join(gamePath, file));
    return true;
  }
  catch {
    return false;
  }
}
async function statCheckAsync(gamePath, file) {
  try {
    await fs.statAsync(path.join(gamePath, file));
    return true;
  }
  catch {
    return false;
  }
}

const getDiscoveryPath = (api) => { //get the game's discovered path
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

//Get the latest EternalModInjector file from the GameBanana API (returns null if unreachable)
async function getLatestInjectorFile() {
  try {
    const data = await util.jsonRequest(INJ_API_FILES_URL);
    const files = (data?._aFiles || []).filter(file => (file?._idRow && file?._sDownloadUrl));
    if (files.length === 0) {
      return null;
    }
    files.sort((a, b) => (b._tsDateAdded || 0) - (a._tsDateAdded || 0)); //newest file first
    return files[0];
  } catch (err) {
    log('warn', `Could not get latest EternalModInjector file from GameBanana API: ${err}`);
    return null;
  }
}

//Get the latest EternalModInjector version from the GameBanana API (returns null if unreachable)
async function getLatestInjectorVersion() {
  try {
    const data = await util.jsonRequest(INJ_API_UPDATES_URL);
    const title = data?._aRecords?.[0]?._sName || ''; //title format: "2026-05-20 (Update 6.66 Rev 3 N)"
    const match = title.match(/\(Update\s+(.+?)\)/);
    return match ? match[1] : null;
  } catch (err) {
    log('warn', `Could not get latest EternalModInjector version from GameBanana API: ${err}`);
    return null;
  }
}

//Check if mod injector is installed
function isEternalModInjectorInstalled(api, spec) {
  const state = api.getState();
  const mods = state.persistent.mods[spec.game.id] || {};
  return Object.keys(mods).some(id => mods[id]?.type === INJECTOR_ID);
}

//Function to auto-download Mod Loader
async function downloadEternalModInjector(api, gameSpec, check = true) {
  let modLoaderInstalled = isEternalModInjectorInstalled(api, gameSpec);
  if (!modLoaderInstalled || !check) {
    const NOTIF_ID = 'doometernal-eternalmodinjector-installing';
    api.sendNotification({ //notification indicating install process
      id: NOTIF_ID,
      message: 'Installing EternalModInjector',
      type: 'activity',
      noDismiss: true,
      allowSuppress: false,
    });
    try { //Download the mod
      const latestFile = await getLatestInjectorFile(); //resolve current file from GameBanana API
      const latestVersion = await getLatestInjectorVersion();
      const dlInfo = {
        game: gameSpec.game.id,
        name: 'EternalModInjector',
      };
      const URL = latestFile ? latestFile._sDownloadUrl : INJ_DL_URL; //fall back to hardcoded file id if API is unreachable
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
        actions.setModAttribute(gameSpec.game.id, modId, 'version', latestVersion || INJ_REV),
        actions.setModAttribute(gameSpec.game.id, modId, INJ_FILE_ATTR, latestFile ? latestFile._idRow : Number(INJ_DL_ID)), // Track the installed file id for update checks
      ];
      util.batchDispatch(api.store, batched); // Will dispatch both actions.
    } catch (err) { //Show the user the download page if the download/install process fails
      const errPage = `https://gamebanana.com/tools/7475`;
      api.showErrorNotification('Failed to download/install EternalModInjector. You must download manually.', err);
      util.opn(errPage).catch(() => null);
    } finally {
      api.dismissNotification(NOTIF_ID);
    }
  }
}

//Check the GameBanana API for a newer EternalModInjector file and notify the user
async function checkForInjectorUpdate(api, gameSpec) {
  if (!isEternalModInjectorInstalled(api, gameSpec)) {
    return;
  }
  const latestFile = await getLatestInjectorFile();
  if (!latestFile) {
    return; //API unreachable - nothing to compare against
  }
  const state = api.getState();
  const mods = state.persistent.mods[gameSpec.game.id] || {};
  const injectorMods = Object.values(mods).filter(mod => mod?.type === INJECTOR_ID);
  const latestArchive = String(latestFile._sFile || '').toLowerCase().replace(/\.zip$/, '');
  const isCurrent = injectorMods.some(mod => // match on tracked file id, or archive name for mods installed before id tracking
    (String(mod?.attributes?.[INJ_FILE_ATTR]) === String(latestFile._idRow))
    || ((latestArchive.length > 0) && String(mod?.attributes?.fileName || '').toLowerCase().includes(latestArchive))
  );
  if (isCurrent) {
    return;
  }
  const latestVersion = await getLatestInjectorVersion();
  api.sendNotification({
    id: 'doometernal-injector-update',
    type: 'warning',
    message: `EternalModInjector update available${latestVersion ? ` (${latestVersion})` : ''}`,
    allowSuppress: true,
    actions: [
      {
        title: 'Download',
        action: (dismiss) => {
          downloadEternalModInjector(api, gameSpec, false);
          dismiss();
        },
      },
    ],
  });
}

//Check for injector updates when Vortex checks mod versions (Check for Updates button)
async function onCheckModVersion(api, gameId, mods, forced) {
  try {
    await checkForInjectorUpdate(api, spec);
  } catch (err) {
    log('warn', `Failed to check for EternalModInjector update: ${err}`);
  }
}

// MOD INSTALLER FUNCTIONS ///////////////////////////////////////////////////

//Installer test for version rollback
function testRollback(files, gameId) {
  const isMod = files.some(file => (path.basename(file).toLowerCase() === ROLLBACK_FILE));
  let supported = (gameId === spec.game.id) && isMod;

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install version rollback files
function installRollback(files) {
  const modFile = files.find(file => (path.basename(file).toLowerCase() === ROLLBACK_FILE));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: BINARIES_ID };

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

//Installer test for EternalModInjector
function testInjector(files, gameId) {
  const isMod = files.some(file => (path.basename(file).toLowerCase() === INJECTOR_FILE));
  let supported = (gameId === spec.game.id) && isMod;

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install EternalModInjector files
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

//Installer test for KTDE
function testKTDE(files, gameId) {
  const isMod = files.some(file => (path.basename(file).toLowerCase() === KTDE_FILE));
  let supported = (gameId === spec.game.id) && isMod;

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install KTDE files
function installKTDE(files) {
  const modFile = files.find(file => (path.basename(file).toLowerCase() === KTDE_FILE));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: BINARIES_ID };

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

//Installer test for Meathook
function testMeat(files, gameId) {
  const isMod = files.some(file => (path.basename(file).toLowerCase() === MEAT_FILE));
  let supported = (gameId === spec.game.id) && isMod;

  return Promise.resolve({
    supported,
    requiredFiles: [],
  });
}

//Installer install Meathook files
function installMeat(files) {
  const modFile = files.find(file => (path.basename(file).toLowerCase() === MEAT_FILE));
  const idx = modFile.indexOf(path.basename(modFile));
  const rootPath = path.dirname(modFile);
  const setModTypeInstruction = { type: 'setmodtype', value: BINARIES_ID };

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

//test for zips
async function testZipContent(files, gameId) {
  let supported = (gameId === spec.game.id);

  return Promise.resolve({
    supported,
    requiredFiles: []
  });
}

//Install zips
async function installZipContent(files, destinationPath) {
  const zipFiles = files.filter(file => ['.zip', '.7z', '.rar'].includes(path.extname(file)));
  // If it's a double zip, we don't need to repack.
  if (zipFiles.length > 0) {
    const instructions = zipFiles.map(file => {
      return {
        type: 'copy',
        source: file,
        destination: path.basename(file),
      }
    });
    return Promise.resolve({ instructions });
  }
  // Repack the ZIP
  else {
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

// MAIN FUNCTIONS ///////////////////////////////////////////////////////////////

//Notify User to run EternalModInjector after deployment
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

//*
async function resolveGameVersion(gamePath) {
  GAME_VERSION = await setGameVersion(gamePath);
  let version = '0.0.0';
  if (GAME_VERSION === 'xbox') { // use appxmanifest.xml for Xbox version
    try {
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
      version = exeVersion.getProductVersion(path.join(gamePath, EXEC));
      return Promise.resolve(version);
    } catch (err) {
      log('error', `Could not read ${EXEC} file to get Steam game version: ${err}`);
      return Promise.resolve(version);
    }
  }
} //*/

//Notify Xbox users they need to dump game files
function xboxNotify(api) {
  const NOTIF_ID = `${GAME_ID}-xbox-notification`;
  const MESSAGE = `Manual Setup Required for Xbox Version`;
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
            text: `Vortex does not support Xbox version of DOOM Eternal. You must manually dump the game files according to the instructions below.\n`
                + `This extension has already installed the ModInjector for you. You only need to dump the files.\n`
          }, [
            {
              label: 'Open Instructions', action: () => {
                util.opn(INJ_INSTR_URL).catch(() => null);
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

//Setup function
async function setup(discovery, api, gameSpec) {
  const state = api.getState();
  GAME_PATH = discovery.path;
  STAGING_FOLDER = selectors.installPathForGame(state, GAME_ID);
  DOWNLOAD_FOLDER = selectors.downloadPathForGame(state, GAME_ID);
  GAME_VERSION = await setGameVersion(GAME_PATH);
  if (GAME_VERSION === 'xbox') {
    xboxNotify(api);
  }
  await downloadEternalModInjector(api, gameSpec);
  await checkForInjectorUpdate(api, gameSpec).catch(() => null); //update check should never block setup
  await fs.ensureDirWritableAsync(path.join(discovery.path, "doomSandBox"));
  return fs.ensureDirWritableAsync(path.join(discovery.path, gameSpec.game.modPath));
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

  //register mod installers
  context.registerInstaller('doometernal-rollback', 25, testRollback, installRollback);
  context.registerInstaller('doometernal-injector', 30, testInjector, installInjector);
  context.registerInstaller('doometernal-ktde', 35, testKTDE, installKTDE);
  context.registerInstaller('doometernal-meathook', 40, testMeat, installMeat);
  context.registerInstaller('doometernal-zip-mod', 45, testZipContent, installZipContent);

  //register actions
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Download Latest EternalModInjector', () => {
    downloadEternalModInjector(context.api, spec, false);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Config Folder', () => {
    util.opn(CONFIG_PATH).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Saves Folder', () => {
    util.opn(SAVE_PATH).catch(() => null);
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
    util.opn(DOWNLOAD_FOLDER).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  });

  //register actions
  /*context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open Save Folder', () => {
    util.opn(SAVE_PATH).catch(() => null);
    }, () => {
      const state = context.api.getState();
      const gameId = selectors.activeGameId(state);
      return gameId === GAME_ID;
  }); //*/
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Open PCGamingWiki Page', () => {
    util.opn(PCGAMINGWIKI_URL).catch(() => null);
  }, () => {
    const state = context.api.getState();
    const gameId = selectors.activeGameId(state);
    return gameId === GAME_ID;
  });
  context.registerAction('mod-icons', 300, 'open-ext', {}, 'Submit Bug Report', () => {
    util.opn(`${EXTENSION_URL}?tab=bugs`).catch(() => null);
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
    const api = context.api;
    api.onAsync('did-deploy', async (profileId, deployment) => {
      const LAST_ACTIVE_PROFILE = selectors.lastActiveProfileForGame(api.getState(), GAME_ID);
      if (profileId !== LAST_ACTIVE_PROFILE) return;
      return deployNotify(context.api);
    });
    api.onAsync('check-mods-version', (gameId, mods, forced) => {
      if (gameId !== GAME_ID) return;
      return onCheckModVersion(api, gameId, mods, forced);
    });
  });
  return true;
}

//export to Vortex
module.exports = {
  default: main,
};
