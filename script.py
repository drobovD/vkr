import time

time.sleep(3)

with open("D:/Projects/Front/temp.txt") as file:
    content = file.read()

result = "Hello, world!" + content

with open("D:/Projects/Front/temp.txt", "w") as file:
    file.write(result)
