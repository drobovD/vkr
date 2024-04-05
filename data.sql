DROP TABLE IF EXISTS tags;
DROP TABLE IF EXISTS records;
DROP TABLE IF EXISTS users;
DROP TABLE IF EXISTS record_types;

/****************************** users ******************************/

CREATE TABLE users (
    `id` VARCHAR(8) NOT NULL,
    `name` VARCHAR(50) NOT NULL,
    `email` VARCHAR(50) NOT NULL,
    `password` VARCHAR(20) NOT NULL,
    `cookie` VARCHAR(50),
    PRIMARY KEY (id)
);

INSERT INTO
    users
VALUES
    ('36056999','user_1','user_1@gmail.com','abcABC123$%',NULL),
    ('54633971','user_2','user_2@gmail.com','abcABC123$%',NULL),
    ('46397531','user_3','user_3@gmail.com','abcABC123$%',NULL);

/****************************** record_types ******************************/

CREATE TABLE record_types (
    `id` INT,
    `name` VARCHAR(15),
    PRIMARY KEY (id)
);

INSERT INTO
    record_types
VALUES
    (1,'article'),
    (2,'video');

/****************************** records ******************************/

CREATE TABLE records (
    `id` INT NOT NULL AUTO_INCREMENT,
	`user_id` VARCHAR(8) NOT NULL,
    `record_type` INT NOT NULL,
    `url` VARCHAR(100),
    `title` VARCHAR(100),
    `content` VARCHAR(1000),
    `img` VARCHAR(50),
    `comment` VARCHAR(1000),
    `favorites` BOOLEAN NOT NULL,
    `recycle_bin` BOOLEAN NOT NULL,
    `link` VARCHAR(10),
    PRIMARY KEY (id),
    FOREIGN KEY (user_id) REFERENCES users (id),
    FOREIGN KEY (record_type) REFERENCES record_types (id)
);

INSERT INTO
    records (user_id, record_type, url, title, content, img, comment, favorites, recycle_bin, link)
VALUES
    ('36056999',1,'http://www.example.com','Record #1',NULL,'05693691.jpg',NULL,false,true, NULL),
    ('36056999',2,'http://www.example.com','Record #2','Content #2',NULL,'Comment #2',true,false, NULL),
    ('36056999',1,'http://www.example.com','Record #3',NULL,'13634534.jpg','Comment #3',false,false,"1234567890"),
    ('36056999',2,'http://www.example.com','Record #4','Content #4',NULL,NULL,true,true, NULL),
    ('36056999',1,'http://www.example.com','Record #5','Content #5',NULL,'Comment #4',false,false, NULL),
    ('54633971',1,'http://www.example.com','Record #6','Content #6',NULL,NULL,false,false, NULL),
    ('54633971',1,'http://www.example.com','Record #7','Content #7',NULL,NULL,true,false, NULL);

/****************************** tags ******************************/

CREATE TABLE tags (
    `tag_id` INT AUTO_INCREMENT,
    `record_id` INT,
    `text` VARCHAR(150),
    PRIMARY KEY (tag_id),
    FOREIGN KEY (record_id) REFERENCES records (id)
);

INSERT INTO
    tags (record_id, text)
VALUES
    (1, 'tag #1 for record #1'),
    (1, 'tag #2 for record #1'),
    (2, 'tag #1 for record #2'),
    (2, 'tag #2 for record #2'),
    (3, 'tag #1 for record #3'),
    (3, 'tag #2 for record #3'),
    (3, 'tag #3 for record #3'),
    (4, 'tag #1 for record #4'),
    (5, 'tag #1 for record #5'),
    (6, 'tag #1 for record #6'),
    (6, 'tag #2 for record #6'),
    (6, 'tag #3 for record #6'),
    (6, 'tag #4 for record #6'),
    (6, 'tag #5 for record #6');