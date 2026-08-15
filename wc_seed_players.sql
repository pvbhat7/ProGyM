-- =====================================================================
-- FIFA World Cup 2026 — Players Seed
-- Auto-generated from Wikipedia "2026 FIFA World Cup squads" (raw wikitext)
-- Run on Hostinger phpMyAdmin AFTER wc_seed_teams.sql has been executed.
-- Safe to re-run: uses INSERT IGNORE.
-- =====================================================================

INSERT IGNORE INTO `wc_players` (`team_id`, `name`, `position`, `jersey_number`, `discontinue`)
SELECT t.id, p.name, p.position, p.jersey_number, 'false'
FROM (
  SELECT 'CZE' AS short_code, 'Matěj Kovář' AS name, 'GK' AS position, 1 AS jersey_number
  UNION ALL
  SELECT 'CZE' AS short_code, 'David Zima' AS name, 'DEF' AS position, 2 AS jersey_number
  UNION ALL
  SELECT 'CZE' AS short_code, 'Tomáš Holeš' AS name, 'DEF' AS position, 3 AS jersey_number
  UNION ALL
  SELECT 'CZE' AS short_code, 'Robin Hranáč' AS name, 'DEF' AS position, 4 AS jersey_number
  UNION ALL
  SELECT 'CZE' AS short_code, 'Vladimír Coufal' AS name, 'DEF' AS position, 5 AS jersey_number
  UNION ALL
  SELECT 'CZE' AS short_code, 'Štěpán Chaloupek' AS name, 'DEF' AS position, 6 AS jersey_number
  UNION ALL
  SELECT 'CZE' AS short_code, 'Ladislav Krejčí' AS name, 'DEF' AS position, 7 AS jersey_number
  UNION ALL
  SELECT 'CZE' AS short_code, 'Vladimír Darida' AS name, 'MID' AS position, 8 AS jersey_number
  UNION ALL
  SELECT 'CZE' AS short_code, 'Adam Hložek' AS name, 'FWD' AS position, 9 AS jersey_number
  UNION ALL
  SELECT 'CZE' AS short_code, 'Patrik Schick' AS name, 'FWD' AS position, 10 AS jersey_number
  UNION ALL
  SELECT 'CZE' AS short_code, 'Jan Kuchta' AS name, 'FWD' AS position, 11 AS jersey_number
  UNION ALL
  SELECT 'CZE' AS short_code, 'Lukáš Červ' AS name, 'MID' AS position, 12 AS jersey_number
  UNION ALL
  SELECT 'CZE' AS short_code, 'Mojmír Chytil' AS name, 'FWD' AS position, 13 AS jersey_number
  UNION ALL
  SELECT 'CZE' AS short_code, 'David Jurásek' AS name, 'DEF' AS position, 14 AS jersey_number
  UNION ALL
  SELECT 'CZE' AS short_code, 'Pavel Šulc' AS name, 'FWD' AS position, 15 AS jersey_number
  UNION ALL
  SELECT 'CZE' AS short_code, 'Jindřich Staněk' AS name, 'GK' AS position, 16 AS jersey_number
  UNION ALL
  SELECT 'CZE' AS short_code, 'Lukáš Provod' AS name, 'MID' AS position, 17 AS jersey_number
  UNION ALL
  SELECT 'CZE' AS short_code, 'Michal Sadílek' AS name, 'MID' AS position, 18 AS jersey_number
  UNION ALL
  SELECT 'CZE' AS short_code, 'Tomáš Chorý' AS name, 'FWD' AS position, 19 AS jersey_number
  UNION ALL
  SELECT 'CZE' AS short_code, 'Jaroslav Zelený' AS name, 'DEF' AS position, 20 AS jersey_number
  UNION ALL
  SELECT 'CZE' AS short_code, 'David Douděra' AS name, 'DEF' AS position, 21 AS jersey_number
  UNION ALL
  SELECT 'CZE' AS short_code, 'Tomáš Souček' AS name, 'MID' AS position, 22 AS jersey_number
  UNION ALL
  SELECT 'CZE' AS short_code, 'Lukáš Horníček' AS name, 'GK' AS position, 23 AS jersey_number
  UNION ALL
  SELECT 'CZE' AS short_code, 'Alexandr Sojka' AS name, 'MID' AS position, 24 AS jersey_number
  UNION ALL
  SELECT 'CZE' AS short_code, 'Hugo Sochůrek' AS name, 'MID' AS position, 25 AS jersey_number
  UNION ALL
  SELECT 'CZE' AS short_code, 'Denis Višinský' AS name, 'FWD' AS position, 26 AS jersey_number
  UNION ALL
  SELECT 'MEX' AS short_code, 'Raúl Rangel' AS name, 'GK' AS position, 1 AS jersey_number
  UNION ALL
  SELECT 'MEX' AS short_code, 'Jorge Sánchez' AS name, 'DEF' AS position, 2 AS jersey_number
  UNION ALL
  SELECT 'MEX' AS short_code, 'César Montes' AS name, 'DEF' AS position, 3 AS jersey_number
  UNION ALL
  SELECT 'MEX' AS short_code, 'Edson Álvarez' AS name, 'DEF' AS position, 4 AS jersey_number
  UNION ALL
  SELECT 'MEX' AS short_code, 'Johan Vásquez' AS name, 'DEF' AS position, 5 AS jersey_number
  UNION ALL
  SELECT 'MEX' AS short_code, 'Érik Lira' AS name, 'MID' AS position, 6 AS jersey_number
  UNION ALL
  SELECT 'MEX' AS short_code, 'Luis Romo' AS name, 'MID' AS position, 7 AS jersey_number
  UNION ALL
  SELECT 'MEX' AS short_code, 'Álvaro Fidalgo' AS name, 'MID' AS position, 8 AS jersey_number
  UNION ALL
  SELECT 'MEX' AS short_code, 'Raúl Jiménez' AS name, 'FWD' AS position, 9 AS jersey_number
  UNION ALL
  SELECT 'MEX' AS short_code, 'Alexis Vega' AS name, 'FWD' AS position, 10 AS jersey_number
  UNION ALL
  SELECT 'MEX' AS short_code, 'Santiago Giménez' AS name, 'FWD' AS position, 11 AS jersey_number
  UNION ALL
  SELECT 'MEX' AS short_code, 'Carlos Acevedo' AS name, 'GK' AS position, 12 AS jersey_number
  UNION ALL
  SELECT 'MEX' AS short_code, 'Guillermo Ochoa' AS name, 'GK' AS position, 13 AS jersey_number
  UNION ALL
  SELECT 'MEX' AS short_code, 'Armando González' AS name, 'FWD' AS position, 14 AS jersey_number
  UNION ALL
  SELECT 'MEX' AS short_code, 'Israel Reyes' AS name, 'DEF' AS position, 15 AS jersey_number
  UNION ALL
  SELECT 'MEX' AS short_code, 'Julián Quiñones' AS name, 'FWD' AS position, 16 AS jersey_number
  UNION ALL
  SELECT 'MEX' AS short_code, 'Orbelín Pineda' AS name, 'MID' AS position, 17 AS jersey_number
  UNION ALL
  SELECT 'MEX' AS short_code, 'Obed Vargas' AS name, 'MID' AS position, 18 AS jersey_number
  UNION ALL
  SELECT 'MEX' AS short_code, 'Gilberto Mora' AS name, 'MID' AS position, 19 AS jersey_number
  UNION ALL
  SELECT 'MEX' AS short_code, 'Mateo Chávez' AS name, 'DEF' AS position, 20 AS jersey_number
  UNION ALL
  SELECT 'MEX' AS short_code, 'César Huerta' AS name, 'FWD' AS position, 21 AS jersey_number
  UNION ALL
  SELECT 'MEX' AS short_code, 'Guillermo Martínez' AS name, 'FWD' AS position, 22 AS jersey_number
  UNION ALL
  SELECT 'MEX' AS short_code, 'Jesús Gallardo' AS name, 'DEF' AS position, 23 AS jersey_number
  UNION ALL
  SELECT 'MEX' AS short_code, 'Luis Chávez' AS name, 'MID' AS position, 24 AS jersey_number
  UNION ALL
  SELECT 'MEX' AS short_code, 'Roberto Alvarado' AS name, 'FWD' AS position, 25 AS jersey_number
  UNION ALL
  SELECT 'MEX' AS short_code, 'Brian Gutiérrez' AS name, 'MID' AS position, 26 AS jersey_number
  UNION ALL
  SELECT 'RSA' AS short_code, 'Ronwen Williams' AS name, 'GK' AS position, 1 AS jersey_number
  UNION ALL
  SELECT 'RSA' AS short_code, 'Thabang Matuludi' AS name, 'DEF' AS position, 2 AS jersey_number
  UNION ALL
  SELECT 'RSA' AS short_code, 'Khulumani Ndamane' AS name, 'DEF' AS position, 3 AS jersey_number
  UNION ALL
  SELECT 'RSA' AS short_code, 'Teboho Mokoena' AS name, 'MID' AS position, 4 AS jersey_number
  UNION ALL
  SELECT 'RSA' AS short_code, 'Thalente Mbatha' AS name, 'MID' AS position, 5 AS jersey_number
  UNION ALL
  SELECT 'RSA' AS short_code, 'Aubrey Modiba' AS name, 'DEF' AS position, 6 AS jersey_number
  UNION ALL
  SELECT 'RSA' AS short_code, 'Oswin Appollis' AS name, 'FWD' AS position, 7 AS jersey_number
  UNION ALL
  SELECT 'RSA' AS short_code, 'Tshepang Moremi' AS name, 'FWD' AS position, 8 AS jersey_number
  UNION ALL
  SELECT 'RSA' AS short_code, 'Lyle Foster' AS name, 'FWD' AS position, 9 AS jersey_number
  UNION ALL
  SELECT 'RSA' AS short_code, 'Relebohile Mofokeng' AS name, 'FWD' AS position, 10 AS jersey_number
  UNION ALL
  SELECT 'RSA' AS short_code, 'Themba Zwane' AS name, 'MID' AS position, 11 AS jersey_number
  UNION ALL
  SELECT 'RSA' AS short_code, 'Thapelo Maseko' AS name, 'FWD' AS position, 12 AS jersey_number
  UNION ALL
  SELECT 'RSA' AS short_code, 'Sphephelo Sithole' AS name, 'MID' AS position, 13 AS jersey_number
  UNION ALL
  SELECT 'RSA' AS short_code, 'Mbekezeli Mbokazi' AS name, 'DEF' AS position, 14 AS jersey_number
  UNION ALL
  SELECT 'RSA' AS short_code, 'Iqraam Rayners' AS name, 'FWD' AS position, 15 AS jersey_number
  UNION ALL
  SELECT 'RSA' AS short_code, 'Sipho Chaine' AS name, 'GK' AS position, 16 AS jersey_number
  UNION ALL
  SELECT 'RSA' AS short_code, 'Evidence Makgopa' AS name, 'FWD' AS position, 17 AS jersey_number
  UNION ALL
  SELECT 'RSA' AS short_code, 'Samukele Kabini' AS name, 'DEF' AS position, 18 AS jersey_number
  UNION ALL
  SELECT 'RSA' AS short_code, 'Nkosinathi Sibisi' AS name, 'DEF' AS position, 19 AS jersey_number
  UNION ALL
  SELECT 'RSA' AS short_code, 'Khuliso Mudau' AS name, 'DEF' AS position, 20 AS jersey_number
  UNION ALL
  SELECT 'RSA' AS short_code, 'Ime Okon' AS name, 'DEF' AS position, 21 AS jersey_number
  UNION ALL
  SELECT 'RSA' AS short_code, 'Ricardo Goss' AS name, 'GK' AS position, 22 AS jersey_number
  UNION ALL
  SELECT 'RSA' AS short_code, 'Jayden Adams' AS name, 'MID' AS position, 23 AS jersey_number
  UNION ALL
  SELECT 'RSA' AS short_code, 'Olwethu Makhanya' AS name, 'DEF' AS position, 24 AS jersey_number
  UNION ALL
  SELECT 'RSA' AS short_code, 'Kamogelo Sebelebele' AS name, 'FWD' AS position, 25 AS jersey_number
  UNION ALL
  SELECT 'RSA' AS short_code, 'Bradley Cross' AS name, 'DEF' AS position, 26 AS jersey_number
  UNION ALL
  SELECT 'KOR' AS short_code, 'Kim Seung-gyu' AS name, 'GK' AS position, 1 AS jersey_number
  UNION ALL
  SELECT 'KOR' AS short_code, 'Lee Han-beom' AS name, 'DEF' AS position, 2 AS jersey_number
  UNION ALL
  SELECT 'KOR' AS short_code, 'Lee Gi-hyuk' AS name, 'MID' AS position, 3 AS jersey_number
  UNION ALL
  SELECT 'KOR' AS short_code, 'Kim Min-jae' AS name, 'DEF' AS position, 4 AS jersey_number
  UNION ALL
  SELECT 'KOR' AS short_code, 'Kim Tae-hyeon' AS name, 'DEF' AS position, 5 AS jersey_number
  UNION ALL
  SELECT 'KOR' AS short_code, 'Hwang In-beom' AS name, 'MID' AS position, 6 AS jersey_number
  UNION ALL
  SELECT 'KOR' AS short_code, 'Son Heung-min' AS name, 'FWD' AS position, 7 AS jersey_number
  UNION ALL
  SELECT 'KOR' AS short_code, 'Paik Seung-ho' AS name, 'MID' AS position, 8 AS jersey_number
  UNION ALL
  SELECT 'KOR' AS short_code, 'Cho Gue-sung' AS name, 'FWD' AS position, 9 AS jersey_number
  UNION ALL
  SELECT 'KOR' AS short_code, 'Lee Jae-sung' AS name, 'MID' AS position, 10 AS jersey_number
  UNION ALL
  SELECT 'KOR' AS short_code, 'Hwang Hee-chan' AS name, 'MID' AS position, 11 AS jersey_number
  UNION ALL
  SELECT 'KOR' AS short_code, 'Song Bum-keun' AS name, 'GK' AS position, 12 AS jersey_number
  UNION ALL
  SELECT 'KOR' AS short_code, 'Lee Tae-seok' AS name, 'DEF' AS position, 13 AS jersey_number
  UNION ALL
  SELECT 'KOR' AS short_code, 'Cho Wi-je' AS name, 'DEF' AS position, 14 AS jersey_number
  UNION ALL
  SELECT 'KOR' AS short_code, 'Kim Moon-hwan' AS name, 'DEF' AS position, 15 AS jersey_number
  UNION ALL
  SELECT 'KOR' AS short_code, 'Park Jin-seob' AS name, 'DEF' AS position, 16 AS jersey_number
  UNION ALL
  SELECT 'KOR' AS short_code, 'Bae Jun-ho' AS name, 'MID' AS position, 17 AS jersey_number
  UNION ALL
  SELECT 'KOR' AS short_code, 'Oh Hyeon-gyu' AS name, 'FWD' AS position, 18 AS jersey_number
  UNION ALL
  SELECT 'KOR' AS short_code, 'Lee Kang-in' AS name, 'MID' AS position, 19 AS jersey_number
  UNION ALL
  SELECT 'KOR' AS short_code, 'Yang Hyun-jun' AS name, 'MID' AS position, 20 AS jersey_number
  UNION ALL
  SELECT 'KOR' AS short_code, 'Jo Hyeon-woo' AS name, 'GK' AS position, 21 AS jersey_number
  UNION ALL
  SELECT 'KOR' AS short_code, 'Seol Young-woo' AS name, 'DEF' AS position, 22 AS jersey_number
  UNION ALL
  SELECT 'KOR' AS short_code, 'Jens Castrop' AS name, 'DEF' AS position, 23 AS jersey_number
  UNION ALL
  SELECT 'KOR' AS short_code, 'Kim Jin-gyu' AS name, 'MID' AS position, 24 AS jersey_number
  UNION ALL
  SELECT 'KOR' AS short_code, 'Eom Ji-sung' AS name, 'MID' AS position, 25 AS jersey_number
  UNION ALL
  SELECT 'KOR' AS short_code, 'Lee Dong-gyeong' AS name, 'MID' AS position, 26 AS jersey_number
  UNION ALL
  SELECT 'BIH' AS short_code, 'Nikola Vasilj' AS name, 'GK' AS position, 1 AS jersey_number
  UNION ALL
  SELECT 'BIH' AS short_code, 'Nihad Mujakić' AS name, 'DEF' AS position, 2 AS jersey_number
  UNION ALL
  SELECT 'BIH' AS short_code, 'Dennis Hadžikadunić' AS name, 'DEF' AS position, 3 AS jersey_number
  UNION ALL
  SELECT 'BIH' AS short_code, 'Tarik Muharemović' AS name, 'DEF' AS position, 4 AS jersey_number
  UNION ALL
  SELECT 'BIH' AS short_code, 'Sead Kolašinac' AS name, 'DEF' AS position, 5 AS jersey_number
  UNION ALL
  SELECT 'BIH' AS short_code, 'Benjamin Tahirović' AS name, 'MID' AS position, 6 AS jersey_number
  UNION ALL
  SELECT 'BIH' AS short_code, 'Amar Dedić' AS name, 'DEF' AS position, 7 AS jersey_number
  UNION ALL
  SELECT 'BIH' AS short_code, 'Armin Gigović' AS name, 'MID' AS position, 8 AS jersey_number
  UNION ALL
  SELECT 'BIH' AS short_code, 'Samed Baždar' AS name, 'FWD' AS position, 9 AS jersey_number
  UNION ALL
  SELECT 'BIH' AS short_code, 'Ermedin Demirović' AS name, 'FWD' AS position, 10 AS jersey_number
  UNION ALL
  SELECT 'BIH' AS short_code, 'Edin Džeko' AS name, 'FWD' AS position, 11 AS jersey_number
  UNION ALL
  SELECT 'BIH' AS short_code, 'Mladen Jurkas' AS name, 'GK' AS position, 12 AS jersey_number
  UNION ALL
  SELECT 'BIH' AS short_code, 'Ivan Bašić' AS name, 'MID' AS position, 13 AS jersey_number
  UNION ALL
  SELECT 'BIH' AS short_code, 'Ivan Šunjić' AS name, 'MID' AS position, 14 AS jersey_number
  UNION ALL
  SELECT 'BIH' AS short_code, 'Amar Memić' AS name, 'MID' AS position, 15 AS jersey_number
  UNION ALL
  SELECT 'BIH' AS short_code, 'Amir Hadžiahmetović' AS name, 'MID' AS position, 16 AS jersey_number
  UNION ALL
  SELECT 'BIH' AS short_code, 'Dženis Burnić' AS name, 'MID' AS position, 17 AS jersey_number
  UNION ALL
  SELECT 'BIH' AS short_code, 'Nikola Katić' AS name, 'DEF' AS position, 18 AS jersey_number
  UNION ALL
  SELECT 'BIH' AS short_code, 'Kerim Alajbegović' AS name, 'FWD' AS position, 19 AS jersey_number
  UNION ALL
  SELECT 'BIH' AS short_code, 'Esmir Bajraktarević' AS name, 'FWD' AS position, 20 AS jersey_number
  UNION ALL
  SELECT 'BIH' AS short_code, 'Stjepan Radeljić' AS name, 'DEF' AS position, 21 AS jersey_number
  UNION ALL
  SELECT 'BIH' AS short_code, 'Martin Zlomislić' AS name, 'GK' AS position, 22 AS jersey_number
  UNION ALL
  SELECT 'BIH' AS short_code, 'Haris Tabaković' AS name, 'FWD' AS position, 23 AS jersey_number
  UNION ALL
  SELECT 'BIH' AS short_code, 'Arjan Malić' AS name, 'DEF' AS position, 24 AS jersey_number
  UNION ALL
  SELECT 'BIH' AS short_code, 'Jovo Lukić' AS name, 'FWD' AS position, 25 AS jersey_number
  UNION ALL
  SELECT 'BIH' AS short_code, 'Ermin Mahmić' AS name, 'MID' AS position, 26 AS jersey_number
  UNION ALL
  SELECT 'CAN' AS short_code, 'Dayne St. Clair' AS name, 'GK' AS position, 1 AS jersey_number
  UNION ALL
  SELECT 'CAN' AS short_code, 'Alistair Johnston' AS name, 'DEF' AS position, 2 AS jersey_number
  UNION ALL
  SELECT 'CAN' AS short_code, 'Alfie Jones' AS name, 'DEF' AS position, 3 AS jersey_number
  UNION ALL
  SELECT 'CAN' AS short_code, 'Luc de Fougerolles' AS name, 'DEF' AS position, 4 AS jersey_number
  UNION ALL
  SELECT 'CAN' AS short_code, 'Joel Waterman' AS name, 'DEF' AS position, 5 AS jersey_number
  UNION ALL
  SELECT 'CAN' AS short_code, 'Mathieu Choinière' AS name, 'MID' AS position, 6 AS jersey_number
  UNION ALL
  SELECT 'CAN' AS short_code, 'Stephen Eustáquio' AS name, 'MID' AS position, 7 AS jersey_number
  UNION ALL
  SELECT 'CAN' AS short_code, 'Ismaël Koné' AS name, 'MID' AS position, 8 AS jersey_number
  UNION ALL
  SELECT 'CAN' AS short_code, 'Cyle Larin' AS name, 'FWD' AS position, 9 AS jersey_number
  UNION ALL
  SELECT 'CAN' AS short_code, 'Jonathan David' AS name, 'FWD' AS position, 10 AS jersey_number
  UNION ALL
  SELECT 'CAN' AS short_code, 'Liam Millar' AS name, 'MID' AS position, 11 AS jersey_number
  UNION ALL
  SELECT 'CAN' AS short_code, 'Tani Oluwaseyi' AS name, 'FWD' AS position, 12 AS jersey_number
  UNION ALL
  SELECT 'CAN' AS short_code, 'Derek Cornelius' AS name, 'DEF' AS position, 13 AS jersey_number
  UNION ALL
  SELECT 'CAN' AS short_code, 'Jacob Shaffelburg' AS name, 'MID' AS position, 14 AS jersey_number
  UNION ALL
  SELECT 'CAN' AS short_code, 'Moïse Bombito' AS name, 'DEF' AS position, 15 AS jersey_number
  UNION ALL
  SELECT 'CAN' AS short_code, 'Maxime Crépeau' AS name, 'GK' AS position, 16 AS jersey_number
  UNION ALL
  SELECT 'CAN' AS short_code, 'Tajon Buchanan' AS name, 'FWD' AS position, 17 AS jersey_number
  UNION ALL
  SELECT 'CAN' AS short_code, 'Owen Goodman' AS name, 'GK' AS position, 18 AS jersey_number
  UNION ALL
  SELECT 'CAN' AS short_code, 'Alphonso Davies' AS name, 'DEF' AS position, 19 AS jersey_number
  UNION ALL
  SELECT 'CAN' AS short_code, 'Ali Ahmed' AS name, 'FWD' AS position, 20 AS jersey_number
  UNION ALL
  SELECT 'CAN' AS short_code, 'Jonathan Osorio' AS name, 'MID' AS position, 21 AS jersey_number
  UNION ALL
  SELECT 'CAN' AS short_code, 'Richie Laryea' AS name, 'DEF' AS position, 22 AS jersey_number
  UNION ALL
  SELECT 'CAN' AS short_code, 'Niko Sigur' AS name, 'DEF' AS position, 23 AS jersey_number
  UNION ALL
  SELECT 'CAN' AS short_code, 'Promise David' AS name, 'FWD' AS position, 24 AS jersey_number
  UNION ALL
  SELECT 'CAN' AS short_code, 'Nathan Saliba' AS name, 'MID' AS position, 25 AS jersey_number
  UNION ALL
  SELECT 'CAN' AS short_code, 'Jayden Nelson' AS name, 'FWD' AS position, 26 AS jersey_number
  UNION ALL
  SELECT 'QAT' AS short_code, 'Mahmud Abunada' AS name, 'GK' AS position, 1 AS jersey_number
  UNION ALL
  SELECT 'QAT' AS short_code, 'Pedro Miguel' AS name, 'DEF' AS position, 2 AS jersey_number
  UNION ALL
  SELECT 'QAT' AS short_code, 'Lucas Mendes' AS name, 'DEF' AS position, 3 AS jersey_number
  UNION ALL
  SELECT 'QAT' AS short_code, 'Issa Laye' AS name, 'DEF' AS position, 4 AS jersey_number
  UNION ALL
  SELECT 'QAT' AS short_code, 'Jassem Gaber' AS name, 'DEF' AS position, 5 AS jersey_number
  UNION ALL
  SELECT 'QAT' AS short_code, 'Abdulaziz Hatem' AS name, 'MID' AS position, 6 AS jersey_number
  UNION ALL
  SELECT 'QAT' AS short_code, 'Ahmed Alaaeldin' AS name, 'FWD' AS position, 7 AS jersey_number
  UNION ALL
  SELECT 'QAT' AS short_code, 'Edmilson Junior' AS name, 'FWD' AS position, 8 AS jersey_number
  UNION ALL
  SELECT 'QAT' AS short_code, 'Mohammed Muntari' AS name, 'FWD' AS position, 9 AS jersey_number
  UNION ALL
  SELECT 'QAT' AS short_code, 'Hassan Al-Haydos' AS name, 'FWD' AS position, 10 AS jersey_number
  UNION ALL
  SELECT 'QAT' AS short_code, 'Akram Afif' AS name, 'FWD' AS position, 11 AS jersey_number
  UNION ALL
  SELECT 'QAT' AS short_code, 'Karim Boudiaf' AS name, 'MID' AS position, 12 AS jersey_number
  UNION ALL
  SELECT 'QAT' AS short_code, 'Ayoub Al-Oui' AS name, 'DEF' AS position, 13 AS jersey_number
  UNION ALL
  SELECT 'QAT' AS short_code, 'Homam Ahmed' AS name, 'DEF' AS position, 14 AS jersey_number
  UNION ALL
  SELECT 'QAT' AS short_code, 'Yusuf Abdurisag' AS name, 'FWD' AS position, 15 AS jersey_number
  UNION ALL
  SELECT 'QAT' AS short_code, 'Boualem Khoukhi' AS name, 'DEF' AS position, 16 AS jersey_number
  UNION ALL
  SELECT 'QAT' AS short_code, 'Ahmed Al-Ganehi' AS name, 'MID' AS position, 17 AS jersey_number
  UNION ALL
  SELECT 'QAT' AS short_code, 'Sultan Al-Brake' AS name, 'DEF' AS position, 18 AS jersey_number
  UNION ALL
  SELECT 'QAT' AS short_code, 'Almoez Ali' AS name, 'FWD' AS position, 19 AS jersey_number
  UNION ALL
  SELECT 'QAT' AS short_code, 'Ahmed Fathy' AS name, 'MID' AS position, 20 AS jersey_number
  UNION ALL
  SELECT 'QAT' AS short_code, 'Salah Zakaria' AS name, 'GK' AS position, 21 AS jersey_number
  UNION ALL
  SELECT 'QAT' AS short_code, 'Meshaal Barsham' AS name, 'GK' AS position, 22 AS jersey_number
  UNION ALL
  SELECT 'QAT' AS short_code, 'Assim Madibo' AS name, 'MID' AS position, 23 AS jersey_number
  UNION ALL
  SELECT 'QAT' AS short_code, 'Tahsin Jamshid' AS name, 'FWD' AS position, 24 AS jersey_number
  UNION ALL
  SELECT 'QAT' AS short_code, 'Al-Hashmi Al-Hussain' AS name, 'DEF' AS position, 25 AS jersey_number
  UNION ALL
  SELECT 'QAT' AS short_code, 'Mohamed Manai' AS name, 'FWD' AS position, 26 AS jersey_number
  UNION ALL
  SELECT 'SUI' AS short_code, 'Gregor Kobel' AS name, 'GK' AS position, 1 AS jersey_number
  UNION ALL
  SELECT 'SUI' AS short_code, 'Miro Muheim' AS name, 'DEF' AS position, 2 AS jersey_number
  UNION ALL
  SELECT 'SUI' AS short_code, 'Silvan Widmer' AS name, 'DEF' AS position, 3 AS jersey_number
  UNION ALL
  SELECT 'SUI' AS short_code, 'Nico Elvedi' AS name, 'DEF' AS position, 4 AS jersey_number
  UNION ALL
  SELECT 'SUI' AS short_code, 'Manuel Akanji' AS name, 'DEF' AS position, 5 AS jersey_number
  UNION ALL
  SELECT 'SUI' AS short_code, 'Denis Zakaria' AS name, 'MID' AS position, 6 AS jersey_number
  UNION ALL
  SELECT 'SUI' AS short_code, 'Breel Embolo' AS name, 'FWD' AS position, 7 AS jersey_number
  UNION ALL
  SELECT 'SUI' AS short_code, 'Remo Freuler' AS name, 'MID' AS position, 8 AS jersey_number
  UNION ALL
  SELECT 'SUI' AS short_code, 'Johan Manzambi' AS name, 'MID' AS position, 9 AS jersey_number
  UNION ALL
  SELECT 'SUI' AS short_code, 'Granit Xhaka' AS name, 'MID' AS position, 10 AS jersey_number
  UNION ALL
  SELECT 'SUI' AS short_code, 'Dan Ndoye' AS name, 'FWD' AS position, 11 AS jersey_number
  UNION ALL
  SELECT 'SUI' AS short_code, 'Yvon Mvogo' AS name, 'GK' AS position, 12 AS jersey_number
  UNION ALL
  SELECT 'SUI' AS short_code, 'Ricardo Rodriguez' AS name, 'DEF' AS position, 13 AS jersey_number
  UNION ALL
  SELECT 'SUI' AS short_code, 'Ardon Jashari' AS name, 'MID' AS position, 14 AS jersey_number
  UNION ALL
  SELECT 'SUI' AS short_code, 'Djibril Sow' AS name, 'MID' AS position, 15 AS jersey_number
  UNION ALL
  SELECT 'SUI' AS short_code, 'Christian Fassnacht' AS name, 'FWD' AS position, 16 AS jersey_number
  UNION ALL
  SELECT 'SUI' AS short_code, 'Rubén Vargas' AS name, 'FWD' AS position, 17 AS jersey_number
  UNION ALL
  SELECT 'SUI' AS short_code, 'Eray Cömert' AS name, 'DEF' AS position, 18 AS jersey_number
  UNION ALL
  SELECT 'SUI' AS short_code, 'Noah Okafor' AS name, 'FWD' AS position, 19 AS jersey_number
  UNION ALL
  SELECT 'SUI' AS short_code, 'Michel Aebischer' AS name, 'MID' AS position, 20 AS jersey_number
  UNION ALL
  SELECT 'SUI' AS short_code, 'Marvin Keller' AS name, 'GK' AS position, 21 AS jersey_number
  UNION ALL
  SELECT 'SUI' AS short_code, 'Fabian Rieder' AS name, 'MID' AS position, 22 AS jersey_number
  UNION ALL
  SELECT 'SUI' AS short_code, 'Zeki Amdouni' AS name, 'FWD' AS position, 23 AS jersey_number
  UNION ALL
  SELECT 'SUI' AS short_code, 'Aurèle Amenda' AS name, 'DEF' AS position, 24 AS jersey_number
  UNION ALL
  SELECT 'SUI' AS short_code, 'Luca Jaquez' AS name, 'DEF' AS position, 25 AS jersey_number
  UNION ALL
  SELECT 'SUI' AS short_code, 'Cedric Itten' AS name, 'FWD' AS position, 26 AS jersey_number
  UNION ALL
  SELECT 'BRA' AS short_code, 'Alisson' AS name, 'GK' AS position, 1 AS jersey_number
  UNION ALL
  SELECT 'BRA' AS short_code, 'Éderson Silva' AS name, 'MID' AS position, 2 AS jersey_number
  UNION ALL
  SELECT 'BRA' AS short_code, 'Gabriel Magalhães' AS name, 'DEF' AS position, 3 AS jersey_number
  UNION ALL
  SELECT 'BRA' AS short_code, 'Marquinhos' AS name, 'DEF' AS position, 4 AS jersey_number
  UNION ALL
  SELECT 'BRA' AS short_code, 'Casemiro' AS name, 'MID' AS position, 5 AS jersey_number
  UNION ALL
  SELECT 'BRA' AS short_code, 'Alex Sandro' AS name, 'DEF' AS position, 6 AS jersey_number
  UNION ALL
  SELECT 'BRA' AS short_code, 'Vinícius Júnior' AS name, 'FWD' AS position, 7 AS jersey_number
  UNION ALL
  SELECT 'BRA' AS short_code, 'Bruno Guimarães' AS name, 'MID' AS position, 8 AS jersey_number
  UNION ALL
  SELECT 'BRA' AS short_code, 'Matheus Cunha' AS name, 'FWD' AS position, 9 AS jersey_number
  UNION ALL
  SELECT 'BRA' AS short_code, 'Neymar' AS name, 'FWD' AS position, 10 AS jersey_number
  UNION ALL
  SELECT 'BRA' AS short_code, 'Raphinha' AS name, 'FWD' AS position, 11 AS jersey_number
  UNION ALL
  SELECT 'BRA' AS short_code, 'Weverton' AS name, 'GK' AS position, 12 AS jersey_number
  UNION ALL
  SELECT 'BRA' AS short_code, 'Danilo Luiz' AS name, 'DEF' AS position, 13 AS jersey_number
  UNION ALL
  SELECT 'BRA' AS short_code, 'Bremer' AS name, 'DEF' AS position, 14 AS jersey_number
  UNION ALL
  SELECT 'BRA' AS short_code, 'Léo Pereira' AS name, 'DEF' AS position, 15 AS jersey_number
  UNION ALL
  SELECT 'BRA' AS short_code, 'Douglas Santos' AS name, 'DEF' AS position, 16 AS jersey_number
  UNION ALL
  SELECT 'BRA' AS short_code, 'Fabinho' AS name, 'MID' AS position, 17 AS jersey_number
  UNION ALL
  SELECT 'BRA' AS short_code, 'Danilo Santos' AS name, 'MID' AS position, 18 AS jersey_number
  UNION ALL
  SELECT 'BRA' AS short_code, 'Endrick' AS name, 'FWD' AS position, 19 AS jersey_number
  UNION ALL
  SELECT 'BRA' AS short_code, 'Lucas Paquetá' AS name, 'MID' AS position, 20 AS jersey_number
  UNION ALL
  SELECT 'BRA' AS short_code, 'Luiz Henrique' AS name, 'FWD' AS position, 21 AS jersey_number
  UNION ALL
  SELECT 'BRA' AS short_code, 'Gabriel Martinelli' AS name, 'FWD' AS position, 22 AS jersey_number
  UNION ALL
  SELECT 'BRA' AS short_code, 'Ederson Moraes' AS name, 'GK' AS position, 23 AS jersey_number
  UNION ALL
  SELECT 'BRA' AS short_code, 'Roger Ibañez' AS name, 'DEF' AS position, 24 AS jersey_number
  UNION ALL
  SELECT 'BRA' AS short_code, 'Igor Thiago' AS name, 'FWD' AS position, 25 AS jersey_number
  UNION ALL
  SELECT 'BRA' AS short_code, 'Rayan' AS name, 'FWD' AS position, 26 AS jersey_number
  UNION ALL
  SELECT 'HAI' AS short_code, 'Johny Placide' AS name, 'GK' AS position, 1 AS jersey_number
  UNION ALL
  SELECT 'HAI' AS short_code, 'Carlens Arcus' AS name, 'DEF' AS position, 2 AS jersey_number
  UNION ALL
  SELECT 'HAI' AS short_code, 'Keeto Thermoncy' AS name, 'DEF' AS position, 3 AS jersey_number
  UNION ALL
  SELECT 'HAI' AS short_code, 'Ricardo Adé' AS name, 'DEF' AS position, 4 AS jersey_number
  UNION ALL
  SELECT 'HAI' AS short_code, 'Hannes Delcroix' AS name, 'DEF' AS position, 5 AS jersey_number
  UNION ALL
  SELECT 'HAI' AS short_code, 'Carl Sainté' AS name, 'MID' AS position, 6 AS jersey_number
  UNION ALL
  SELECT 'HAI' AS short_code, 'Derrick Etienne Jr.' AS name, 'FWD' AS position, 7 AS jersey_number
  UNION ALL
  SELECT 'HAI' AS short_code, 'Martin Expérience' AS name, 'DEF' AS position, 8 AS jersey_number
  UNION ALL
  SELECT 'HAI' AS short_code, 'Duckens Nazon' AS name, 'FWD' AS position, 9 AS jersey_number
  UNION ALL
  SELECT 'HAI' AS short_code, 'Jean-Ricner Bellegarde' AS name, 'MID' AS position, 10 AS jersey_number
  UNION ALL
  SELECT 'HAI' AS short_code, 'Louicius Deedson' AS name, 'FWD' AS position, 11 AS jersey_number
  UNION ALL
  SELECT 'HAI' AS short_code, 'Alexandre Pierre' AS name, 'GK' AS position, 12 AS jersey_number
  UNION ALL
  SELECT 'HAI' AS short_code, 'Duke Lacroix' AS name, 'DEF' AS position, 13 AS jersey_number
  UNION ALL
  SELECT 'HAI' AS short_code, 'Garven Metusala' AS name, 'DEF' AS position, 14 AS jersey_number
  UNION ALL
  SELECT 'HAI' AS short_code, 'Ruben Providence' AS name, 'FWD' AS position, 15 AS jersey_number
  UNION ALL
  SELECT 'HAI' AS short_code, 'Lenny Joseph' AS name, 'FWD' AS position, 16 AS jersey_number
  UNION ALL
  SELECT 'HAI' AS short_code, 'Danley Jean Jacques' AS name, 'MID' AS position, 17 AS jersey_number
  UNION ALL
  SELECT 'HAI' AS short_code, 'Wilson Isidor' AS name, 'FWD' AS position, 18 AS jersey_number
  UNION ALL
  SELECT 'HAI' AS short_code, 'Yassin Fortuné' AS name, 'FWD' AS position, 19 AS jersey_number
  UNION ALL
  SELECT 'HAI' AS short_code, 'Frantzdy Pierrot' AS name, 'FWD' AS position, 20 AS jersey_number
  UNION ALL
  SELECT 'HAI' AS short_code, 'Josué Casimir' AS name, 'FWD' AS position, 21 AS jersey_number
  UNION ALL
  SELECT 'HAI' AS short_code, 'Jean-Kévin Duverne' AS name, 'DEF' AS position, 22 AS jersey_number
  UNION ALL
  SELECT 'HAI' AS short_code, 'Josué Duverger' AS name, 'GK' AS position, 23 AS jersey_number
  UNION ALL
  SELECT 'HAI' AS short_code, 'Wilguens Paugain' AS name, 'DEF' AS position, 24 AS jersey_number
  UNION ALL
  SELECT 'HAI' AS short_code, 'Dominique Simon' AS name, 'MID' AS position, 25 AS jersey_number
  UNION ALL
  SELECT 'HAI' AS short_code, 'Woodensky Pierre' AS name, 'MID' AS position, 26 AS jersey_number
  UNION ALL
  SELECT 'MAR' AS short_code, 'Yassine Bounou' AS name, 'GK' AS position, 1 AS jersey_number
  UNION ALL
  SELECT 'MAR' AS short_code, 'Achraf Hakimi' AS name, 'DEF' AS position, 2 AS jersey_number
  UNION ALL
  SELECT 'MAR' AS short_code, 'Noussair Mazraoui' AS name, 'DEF' AS position, 3 AS jersey_number
  UNION ALL
  SELECT 'MAR' AS short_code, 'Sofyan Amrabat' AS name, 'MID' AS position, 4 AS jersey_number
  UNION ALL
  SELECT 'MAR' AS short_code, 'Marwane Saâdane' AS name, 'DEF' AS position, 5 AS jersey_number
  UNION ALL
  SELECT 'MAR' AS short_code, 'Ayyoub Bouaddi' AS name, 'MID' AS position, 6 AS jersey_number
  UNION ALL
  SELECT 'MAR' AS short_code, 'Chemsdine Talbi' AS name, 'MID' AS position, 7 AS jersey_number
  UNION ALL
  SELECT 'MAR' AS short_code, 'Azzedine Ounahi' AS name, 'MID' AS position, 8 AS jersey_number
  UNION ALL
  SELECT 'MAR' AS short_code, 'Soufiane Rahimi' AS name, 'FWD' AS position, 9 AS jersey_number
  UNION ALL
  SELECT 'MAR' AS short_code, 'Brahim Díaz' AS name, 'FWD' AS position, 10 AS jersey_number
  UNION ALL
  SELECT 'MAR' AS short_code, 'Ismael Saibari' AS name, 'MID' AS position, 11 AS jersey_number
  UNION ALL
  SELECT 'MAR' AS short_code, 'Munir Mohamedi' AS name, 'GK' AS position, 12 AS jersey_number
  UNION ALL
  SELECT 'MAR' AS short_code, 'Zakaria El Ouahdi' AS name, 'DEF' AS position, 13 AS jersey_number
  UNION ALL
  SELECT 'MAR' AS short_code, 'Issa Diop' AS name, 'DEF' AS position, 14 AS jersey_number
  UNION ALL
  SELECT 'MAR' AS short_code, 'Samir El Mourabet' AS name, 'MID' AS position, 15 AS jersey_number
  UNION ALL
  SELECT 'MAR' AS short_code, 'Gessime Yassine' AS name, 'MID' AS position, 16 AS jersey_number
  UNION ALL
  SELECT 'MAR' AS short_code, 'Amine Sbaï' AS name, 'FWD' AS position, 17 AS jersey_number
  UNION ALL
  SELECT 'MAR' AS short_code, 'Chadi Riad' AS name, 'DEF' AS position, 18 AS jersey_number
  UNION ALL
  SELECT 'MAR' AS short_code, 'Youssef Belammari' AS name, 'DEF' AS position, 19 AS jersey_number
  UNION ALL
  SELECT 'MAR' AS short_code, 'Ayoub El Kaabi' AS name, 'FWD' AS position, 20 AS jersey_number
  UNION ALL
  SELECT 'MAR' AS short_code, 'Ayoube Amaimouni' AS name, 'FWD' AS position, 21 AS jersey_number
  UNION ALL
  SELECT 'MAR' AS short_code, 'Ahmed Reda Tagnaouti' AS name, 'GK' AS position, 22 AS jersey_number
  UNION ALL
  SELECT 'MAR' AS short_code, 'Bilal El Khannouss' AS name, 'MID' AS position, 23 AS jersey_number
  UNION ALL
  SELECT 'MAR' AS short_code, 'Neil El Aynaoui' AS name, 'MID' AS position, 24 AS jersey_number
  UNION ALL
  SELECT 'MAR' AS short_code, 'Redouane Halhal' AS name, 'DEF' AS position, 25 AS jersey_number
  UNION ALL
  SELECT 'MAR' AS short_code, 'Anass Salah-Eddine' AS name, 'DEF' AS position, 26 AS jersey_number
  UNION ALL
  SELECT 'SCO' AS short_code, 'Angus Gunn' AS name, 'GK' AS position, 1 AS jersey_number
  UNION ALL
  SELECT 'SCO' AS short_code, 'Aaron Hickey' AS name, 'DEF' AS position, 2 AS jersey_number
  UNION ALL
  SELECT 'SCO' AS short_code, 'Andy Robertson' AS name, 'DEF' AS position, 3 AS jersey_number
  UNION ALL
  SELECT 'SCO' AS short_code, 'Scott McTominay' AS name, 'MID' AS position, 4 AS jersey_number
  UNION ALL
  SELECT 'SCO' AS short_code, 'Grant Hanley' AS name, 'DEF' AS position, 5 AS jersey_number
  UNION ALL
  SELECT 'SCO' AS short_code, 'Kieran Tierney' AS name, 'DEF' AS position, 6 AS jersey_number
  UNION ALL
  SELECT 'SCO' AS short_code, 'John McGinn' AS name, 'MID' AS position, 7 AS jersey_number
  UNION ALL
  SELECT 'SCO' AS short_code, 'Tyler Fletcher' AS name, 'MID' AS position, 8 AS jersey_number
  UNION ALL
  SELECT 'SCO' AS short_code, 'Lyndon Dykes' AS name, 'FWD' AS position, 9 AS jersey_number
  UNION ALL
  SELECT 'SCO' AS short_code, 'Ché Adams' AS name, 'FWD' AS position, 10 AS jersey_number
  UNION ALL
  SELECT 'SCO' AS short_code, 'Ryan Christie' AS name, 'MID' AS position, 11 AS jersey_number
  UNION ALL
  SELECT 'SCO' AS short_code, 'Liam Kelly' AS name, 'GK' AS position, 12 AS jersey_number
  UNION ALL
  SELECT 'SCO' AS short_code, 'Jack Hendry' AS name, 'DEF' AS position, 13 AS jersey_number
  UNION ALL
  SELECT 'SCO' AS short_code, 'Ross Stewart' AS name, 'FWD' AS position, 14 AS jersey_number
  UNION ALL
  SELECT 'SCO' AS short_code, 'John Souttar' AS name, 'DEF' AS position, 15 AS jersey_number
  UNION ALL
  SELECT 'SCO' AS short_code, 'Dominic Hyam' AS name, 'DEF' AS position, 16 AS jersey_number
  UNION ALL
  SELECT 'SCO' AS short_code, 'Ben Gannon-Doak' AS name, 'FWD' AS position, 17 AS jersey_number
  UNION ALL
  SELECT 'SCO' AS short_code, 'George Hirst' AS name, 'FWD' AS position, 18 AS jersey_number
  UNION ALL
  SELECT 'SCO' AS short_code, 'Lewis Ferguson' AS name, 'MID' AS position, 19 AS jersey_number
  UNION ALL
  SELECT 'SCO' AS short_code, 'Lawrence Shankland' AS name, 'FWD' AS position, 20 AS jersey_number
  UNION ALL
  SELECT 'SCO' AS short_code, 'Craig Gordon' AS name, 'GK' AS position, 21 AS jersey_number
  UNION ALL
  SELECT 'SCO' AS short_code, 'Nathan Patterson' AS name, 'DEF' AS position, 22 AS jersey_number
  UNION ALL
  SELECT 'SCO' AS short_code, 'Kenny McLean' AS name, 'MID' AS position, 23 AS jersey_number
  UNION ALL
  SELECT 'SCO' AS short_code, 'Anthony Ralston' AS name, 'DEF' AS position, 24 AS jersey_number
  UNION ALL
  SELECT 'SCO' AS short_code, 'Findlay Curtis' AS name, 'FWD' AS position, 25 AS jersey_number
  UNION ALL
  SELECT 'SCO' AS short_code, 'Scott McKenna' AS name, 'DEF' AS position, 26 AS jersey_number
  UNION ALL
  SELECT 'AUS' AS short_code, 'Mathew Ryan' AS name, 'GK' AS position, 1 AS jersey_number
  UNION ALL
  SELECT 'AUS' AS short_code, 'Miloš Degenek' AS name, 'DEF' AS position, 2 AS jersey_number
  UNION ALL
  SELECT 'AUS' AS short_code, 'Alessandro Circati' AS name, 'DEF' AS position, 3 AS jersey_number
  UNION ALL
  SELECT 'AUS' AS short_code, 'Jacob Italiano' AS name, 'DEF' AS position, 4 AS jersey_number
  UNION ALL
  SELECT 'AUS' AS short_code, 'Jordan Bos' AS name, 'DEF' AS position, 5 AS jersey_number
  UNION ALL
  SELECT 'AUS' AS short_code, 'Jason Geria' AS name, 'DEF' AS position, 6 AS jersey_number
  UNION ALL
  SELECT 'AUS' AS short_code, 'Mathew Leckie' AS name, 'FWD' AS position, 7 AS jersey_number
  UNION ALL
  SELECT 'AUS' AS short_code, 'Connor Metcalfe' AS name, 'MID' AS position, 8 AS jersey_number
  UNION ALL
  SELECT 'AUS' AS short_code, 'Mohamed Touré' AS name, 'FWD' AS position, 9 AS jersey_number
  UNION ALL
  SELECT 'AUS' AS short_code, 'Ajdin Hrustic' AS name, 'FWD' AS position, 10 AS jersey_number
  UNION ALL
  SELECT 'AUS' AS short_code, 'Awer Mabil' AS name, 'FWD' AS position, 11 AS jersey_number
  UNION ALL
  SELECT 'AUS' AS short_code, 'Paul Izzo' AS name, 'GK' AS position, 12 AS jersey_number
  UNION ALL
  SELECT 'AUS' AS short_code, 'Aiden O''Neill' AS name, 'MID' AS position, 13 AS jersey_number
  UNION ALL
  SELECT 'AUS' AS short_code, 'Cammy Devlin' AS name, 'MID' AS position, 14 AS jersey_number
  UNION ALL
  SELECT 'AUS' AS short_code, 'Kai Trewin' AS name, 'DEF' AS position, 15 AS jersey_number
  UNION ALL
  SELECT 'AUS' AS short_code, 'Aziz Behich' AS name, 'DEF' AS position, 16 AS jersey_number
  UNION ALL
  SELECT 'AUS' AS short_code, 'Nestory Irankunda' AS name, 'FWD' AS position, 17 AS jersey_number
  UNION ALL
  SELECT 'AUS' AS short_code, 'Patrick Beach' AS name, 'GK' AS position, 18 AS jersey_number
  UNION ALL
  SELECT 'AUS' AS short_code, 'Harry Souttar' AS name, 'DEF' AS position, 19 AS jersey_number
  UNION ALL
  SELECT 'AUS' AS short_code, 'Cristian Volpato' AS name, 'FWD' AS position, 20 AS jersey_number
  UNION ALL
  SELECT 'AUS' AS short_code, 'Cameron Burgess' AS name, 'DEF' AS position, 21 AS jersey_number
  UNION ALL
  SELECT 'AUS' AS short_code, 'Jackson Irvine' AS name, 'MID' AS position, 22 AS jersey_number
  UNION ALL
  SELECT 'AUS' AS short_code, 'Nishan Velupillay' AS name, 'FWD' AS position, 23 AS jersey_number
  UNION ALL
  SELECT 'AUS' AS short_code, 'Paul Okon-Engstler' AS name, 'MID' AS position, 24 AS jersey_number
  UNION ALL
  SELECT 'AUS' AS short_code, 'Lucas Herrington' AS name, 'DEF' AS position, 25 AS jersey_number
  UNION ALL
  SELECT 'AUS' AS short_code, 'Tete Yengi' AS name, 'FWD' AS position, 26 AS jersey_number
  UNION ALL
  SELECT 'PAR' AS short_code, 'Gatito Fernández' AS name, 'GK' AS position, 1 AS jersey_number
  UNION ALL
  SELECT 'PAR' AS short_code, 'Gustavo Velázquez' AS name, 'DEF' AS position, 2 AS jersey_number
  UNION ALL
  SELECT 'PAR' AS short_code, 'Omar Alderete' AS name, 'DEF' AS position, 3 AS jersey_number
  UNION ALL
  SELECT 'PAR' AS short_code, 'Juan José Cáceres' AS name, 'DEF' AS position, 4 AS jersey_number
  UNION ALL
  SELECT 'PAR' AS short_code, 'Fabián Balbuena' AS name, 'DEF' AS position, 5 AS jersey_number
  UNION ALL
  SELECT 'PAR' AS short_code, 'Júnior Alonso' AS name, 'DEF' AS position, 6 AS jersey_number
  UNION ALL
  SELECT 'PAR' AS short_code, 'Ramón Sosa' AS name, 'MID' AS position, 7 AS jersey_number
  UNION ALL
  SELECT 'PAR' AS short_code, 'Diego Gómez' AS name, 'MID' AS position, 8 AS jersey_number
  UNION ALL
  SELECT 'PAR' AS short_code, 'Antonio Sanabria' AS name, 'FWD' AS position, 9 AS jersey_number
  UNION ALL
  SELECT 'PAR' AS short_code, 'Miguel Almirón' AS name, 'MID' AS position, 10 AS jersey_number
  UNION ALL
  SELECT 'PAR' AS short_code, 'Maurício' AS name, 'MID' AS position, 11 AS jersey_number
  UNION ALL
  SELECT 'PAR' AS short_code, 'Orlando Gill' AS name, 'GK' AS position, 12 AS jersey_number
  UNION ALL
  SELECT 'PAR' AS short_code, 'José Canale' AS name, 'DEF' AS position, 13 AS jersey_number
  UNION ALL
  SELECT 'PAR' AS short_code, 'Andrés Cubas' AS name, 'MID' AS position, 14 AS jersey_number
  UNION ALL
  SELECT 'PAR' AS short_code, 'Gustavo Gómez' AS name, 'DEF' AS position, 15 AS jersey_number
  UNION ALL
  SELECT 'PAR' AS short_code, 'Damián Bobadilla' AS name, 'MID' AS position, 16 AS jersey_number
  UNION ALL
  SELECT 'PAR' AS short_code, 'Kaku' AS name, 'FWD' AS position, 17 AS jersey_number
  UNION ALL
  SELECT 'PAR' AS short_code, 'Álex Arce' AS name, 'FWD' AS position, 18 AS jersey_number
  UNION ALL
  SELECT 'PAR' AS short_code, 'Julio Enciso' AS name, 'FWD' AS position, 19 AS jersey_number
  UNION ALL
  SELECT 'PAR' AS short_code, 'Braian Ojeda' AS name, 'MID' AS position, 20 AS jersey_number
  UNION ALL
  SELECT 'PAR' AS short_code, 'Gabriel Ávalos' AS name, 'FWD' AS position, 21 AS jersey_number
  UNION ALL
  SELECT 'PAR' AS short_code, 'Gastón Olveira' AS name, 'GK' AS position, 22 AS jersey_number
  UNION ALL
  SELECT 'PAR' AS short_code, 'Matías Galarza' AS name, 'MID' AS position, 23 AS jersey_number
  UNION ALL
  SELECT 'PAR' AS short_code, 'Gustavo Caballero' AS name, 'MID' AS position, 24 AS jersey_number
  UNION ALL
  SELECT 'PAR' AS short_code, 'Isidro Pitta' AS name, 'FWD' AS position, 25 AS jersey_number
  UNION ALL
  SELECT 'PAR' AS short_code, 'Alexandro Maidana' AS name, 'DEF' AS position, 26 AS jersey_number
  UNION ALL
  SELECT 'TUR' AS short_code, 'Mert Günok' AS name, 'GK' AS position, 1 AS jersey_number
  UNION ALL
  SELECT 'TUR' AS short_code, 'Zeki Çelik' AS name, 'DEF' AS position, 2 AS jersey_number
  UNION ALL
  SELECT 'TUR' AS short_code, 'Merih Demiral' AS name, 'DEF' AS position, 3 AS jersey_number
  UNION ALL
  SELECT 'TUR' AS short_code, 'Çağlar Söyüncü' AS name, 'DEF' AS position, 4 AS jersey_number
  UNION ALL
  SELECT 'TUR' AS short_code, 'Salih Özcan' AS name, 'MID' AS position, 5 AS jersey_number
  UNION ALL
  SELECT 'TUR' AS short_code, 'Orkun Kökçü' AS name, 'MID' AS position, 6 AS jersey_number
  UNION ALL
  SELECT 'TUR' AS short_code, 'Kerem Aktürkoğlu' AS name, 'FWD' AS position, 7 AS jersey_number
  UNION ALL
  SELECT 'TUR' AS short_code, 'Arda Güler' AS name, 'FWD' AS position, 8 AS jersey_number
  UNION ALL
  SELECT 'TUR' AS short_code, 'Deniz Gül' AS name, 'FWD' AS position, 9 AS jersey_number
  UNION ALL
  SELECT 'TUR' AS short_code, 'Hakan Çalhanoğlu' AS name, 'MID' AS position, 10 AS jersey_number
  UNION ALL
  SELECT 'TUR' AS short_code, 'Kenan Yıldız' AS name, 'FWD' AS position, 11 AS jersey_number
  UNION ALL
  SELECT 'TUR' AS short_code, 'Altay Bayındır' AS name, 'GK' AS position, 12 AS jersey_number
  UNION ALL
  SELECT 'TUR' AS short_code, 'Eren Elmalı' AS name, 'DEF' AS position, 13 AS jersey_number
  UNION ALL
  SELECT 'TUR' AS short_code, 'Abdülkerim Bardakcı' AS name, 'DEF' AS position, 14 AS jersey_number
  UNION ALL
  SELECT 'TUR' AS short_code, 'Ozan Kabak' AS name, 'DEF' AS position, 15 AS jersey_number
  UNION ALL
  SELECT 'TUR' AS short_code, 'İsmail Yüksek' AS name, 'MID' AS position, 16 AS jersey_number
  UNION ALL
  SELECT 'TUR' AS short_code, 'İrfan Can Kahveci' AS name, 'FWD' AS position, 17 AS jersey_number
  UNION ALL
  SELECT 'TUR' AS short_code, 'Mert Müldür' AS name, 'DEF' AS position, 18 AS jersey_number
  UNION ALL
  SELECT 'TUR' AS short_code, 'Yunus Akgün' AS name, 'FWD' AS position, 19 AS jersey_number
  UNION ALL
  SELECT 'TUR' AS short_code, 'Ferdi Kadıoğlu' AS name, 'DEF' AS position, 20 AS jersey_number
  UNION ALL
  SELECT 'TUR' AS short_code, 'Barış Alper Yılmaz' AS name, 'FWD' AS position, 21 AS jersey_number
  UNION ALL
  SELECT 'TUR' AS short_code, 'Kaan Ayhan' AS name, 'MID' AS position, 22 AS jersey_number
  UNION ALL
  SELECT 'TUR' AS short_code, 'Uğurcan Çakır' AS name, 'GK' AS position, 23 AS jersey_number
  UNION ALL
  SELECT 'TUR' AS short_code, 'Oğuz Aydın' AS name, 'FWD' AS position, 24 AS jersey_number
  UNION ALL
  SELECT 'TUR' AS short_code, 'Samet Akaydin' AS name, 'DEF' AS position, 25 AS jersey_number
  UNION ALL
  SELECT 'TUR' AS short_code, 'Can Uzun' AS name, 'FWD' AS position, 26 AS jersey_number
  UNION ALL
  SELECT 'USA' AS short_code, 'Matt Turner' AS name, 'GK' AS position, 1 AS jersey_number
  UNION ALL
  SELECT 'USA' AS short_code, 'Sergiño Dest' AS name, 'DEF' AS position, 2 AS jersey_number
  UNION ALL
  SELECT 'USA' AS short_code, 'Chris Richards' AS name, 'DEF' AS position, 3 AS jersey_number
  UNION ALL
  SELECT 'USA' AS short_code, 'Tyler Adams' AS name, 'MID' AS position, 4 AS jersey_number
  UNION ALL
  SELECT 'USA' AS short_code, 'Antonee Robinson' AS name, 'DEF' AS position, 5 AS jersey_number
  UNION ALL
  SELECT 'USA' AS short_code, 'Auston Trusty' AS name, 'DEF' AS position, 6 AS jersey_number
  UNION ALL
  SELECT 'USA' AS short_code, 'Giovanni Reyna' AS name, 'MID' AS position, 7 AS jersey_number
  UNION ALL
  SELECT 'USA' AS short_code, 'Weston McKennie' AS name, 'MID' AS position, 8 AS jersey_number
  UNION ALL
  SELECT 'USA' AS short_code, 'Ricardo Pepi' AS name, 'FWD' AS position, 9 AS jersey_number
  UNION ALL
  SELECT 'USA' AS short_code, 'Christian Pulisic' AS name, 'FWD' AS position, 10 AS jersey_number
  UNION ALL
  SELECT 'USA' AS short_code, 'Brenden Aaronson' AS name, 'FWD' AS position, 11 AS jersey_number
  UNION ALL
  SELECT 'USA' AS short_code, 'Miles Robinson' AS name, 'DEF' AS position, 12 AS jersey_number
  UNION ALL
  SELECT 'USA' AS short_code, 'Tim Ream' AS name, 'DEF' AS position, 13 AS jersey_number
  UNION ALL
  SELECT 'USA' AS short_code, 'Sebastian Berhalter' AS name, 'MID' AS position, 14 AS jersey_number
  UNION ALL
  SELECT 'USA' AS short_code, 'Cristian Roldan' AS name, 'MID' AS position, 15 AS jersey_number
  UNION ALL
  SELECT 'USA' AS short_code, 'Alex Freeman' AS name, 'DEF' AS position, 16 AS jersey_number
  UNION ALL
  SELECT 'USA' AS short_code, 'Malik Tillman' AS name, 'MID' AS position, 17 AS jersey_number
  UNION ALL
  SELECT 'USA' AS short_code, 'Max Arfsten' AS name, 'DEF' AS position, 18 AS jersey_number
  UNION ALL
  SELECT 'USA' AS short_code, 'Haji Wright' AS name, 'FWD' AS position, 19 AS jersey_number
  UNION ALL
  SELECT 'USA' AS short_code, 'Folarin Balogun' AS name, 'FWD' AS position, 20 AS jersey_number
  UNION ALL
  SELECT 'USA' AS short_code, 'Timothy Weah' AS name, 'FWD' AS position, 21 AS jersey_number
  UNION ALL
  SELECT 'USA' AS short_code, 'Mark McKenzie' AS name, 'DEF' AS position, 22 AS jersey_number
  UNION ALL
  SELECT 'USA' AS short_code, 'Joe Scally' AS name, 'DEF' AS position, 23 AS jersey_number
  UNION ALL
  SELECT 'USA' AS short_code, 'Matt Freese' AS name, 'GK' AS position, 24 AS jersey_number
  UNION ALL
  SELECT 'USA' AS short_code, 'Chris Brady' AS name, 'GK' AS position, 25 AS jersey_number
  UNION ALL
  SELECT 'USA' AS short_code, 'Alejandro Zendejas' AS name, 'FWD' AS position, 26 AS jersey_number
  UNION ALL
  SELECT 'CUW' AS short_code, 'Eloy Room' AS name, 'GK' AS position, 1 AS jersey_number
  UNION ALL
  SELECT 'CUW' AS short_code, 'Shurandy Sambo' AS name, 'DEF' AS position, 2 AS jersey_number
  UNION ALL
  SELECT 'CUW' AS short_code, 'Juriën Gaari' AS name, 'DEF' AS position, 3 AS jersey_number
  UNION ALL
  SELECT 'CUW' AS short_code, 'Roshon van Eijma' AS name, 'DEF' AS position, 4 AS jersey_number
  UNION ALL
  SELECT 'CUW' AS short_code, 'Sherel Floranus' AS name, 'DEF' AS position, 5 AS jersey_number
  UNION ALL
  SELECT 'CUW' AS short_code, 'Godfried Roemeratoe' AS name, 'MID' AS position, 6 AS jersey_number
  UNION ALL
  SELECT 'CUW' AS short_code, 'Juninho Bacuna' AS name, 'MID' AS position, 7 AS jersey_number
  UNION ALL
  SELECT 'CUW' AS short_code, 'Livano Comenencia' AS name, 'MID' AS position, 8 AS jersey_number
  UNION ALL
  SELECT 'CUW' AS short_code, 'Jürgen Locadia' AS name, 'FWD' AS position, 9 AS jersey_number
  UNION ALL
  SELECT 'CUW' AS short_code, 'Leandro Bacuna' AS name, 'MID' AS position, 10 AS jersey_number
  UNION ALL
  SELECT 'CUW' AS short_code, 'Jeremy Antonisse' AS name, 'FWD' AS position, 11 AS jersey_number
  UNION ALL
  SELECT 'CUW' AS short_code, 'Sontje Hansen' AS name, 'FWD' AS position, 12 AS jersey_number
  UNION ALL
  SELECT 'CUW' AS short_code, 'Tyrese Noslin' AS name, 'FWD' AS position, 13 AS jersey_number
  UNION ALL
  SELECT 'CUW' AS short_code, 'Kenji Gorré' AS name, 'FWD' AS position, 14 AS jersey_number
  UNION ALL
  SELECT 'CUW' AS short_code, 'Ar''jany Martha' AS name, 'MID' AS position, 15 AS jersey_number
  UNION ALL
  SELECT 'CUW' AS short_code, 'Jearl Margaritha' AS name, 'FWD' AS position, 16 AS jersey_number
  UNION ALL
  SELECT 'CUW' AS short_code, 'Brandley Kuwas' AS name, 'FWD' AS position, 17 AS jersey_number
  UNION ALL
  SELECT 'CUW' AS short_code, 'Armando Obispo' AS name, 'DEF' AS position, 18 AS jersey_number
  UNION ALL
  SELECT 'CUW' AS short_code, 'Gervane Kastaneer' AS name, 'FWD' AS position, 19 AS jersey_number
  UNION ALL
  SELECT 'CUW' AS short_code, 'Joshua Brenet' AS name, 'DEF' AS position, 20 AS jersey_number
  UNION ALL
  SELECT 'CUW' AS short_code, 'Tahith Chong' AS name, 'MID' AS position, 21 AS jersey_number
  UNION ALL
  SELECT 'CUW' AS short_code, 'Kevin Felida' AS name, 'MID' AS position, 22 AS jersey_number
  UNION ALL
  SELECT 'CUW' AS short_code, 'Riechedly Bazoer' AS name, 'DEF' AS position, 23 AS jersey_number
  UNION ALL
  SELECT 'CUW' AS short_code, 'Deveron Fonville' AS name, 'DEF' AS position, 24 AS jersey_number
  UNION ALL
  SELECT 'CUW' AS short_code, 'Tyrick Bodak' AS name, 'GK' AS position, 25 AS jersey_number
  UNION ALL
  SELECT 'CUW' AS short_code, 'Trevor Doornbusch' AS name, 'GK' AS position, 26 AS jersey_number
  UNION ALL
  SELECT 'ECU' AS short_code, 'Hernán Galíndez' AS name, 'GK' AS position, 1 AS jersey_number
  UNION ALL
  SELECT 'ECU' AS short_code, 'Félix Torres' AS name, 'DEF' AS position, 2 AS jersey_number
  UNION ALL
  SELECT 'ECU' AS short_code, 'Piero Hincapié' AS name, 'DEF' AS position, 3 AS jersey_number
  UNION ALL
  SELECT 'ECU' AS short_code, 'Joel Ordóñez' AS name, 'DEF' AS position, 4 AS jersey_number
  UNION ALL
  SELECT 'ECU' AS short_code, 'Jordy Alcívar' AS name, 'MID' AS position, 5 AS jersey_number
  UNION ALL
  SELECT 'ECU' AS short_code, 'Willian Pacho' AS name, 'DEF' AS position, 6 AS jersey_number
  UNION ALL
  SELECT 'ECU' AS short_code, 'Pervis Estupiñán' AS name, 'DEF' AS position, 7 AS jersey_number
  UNION ALL
  SELECT 'ECU' AS short_code, 'Anthony Valencia' AS name, 'MID' AS position, 8 AS jersey_number
  UNION ALL
  SELECT 'ECU' AS short_code, 'John Yeboah' AS name, 'FWD' AS position, 9 AS jersey_number
  UNION ALL
  SELECT 'ECU' AS short_code, 'Kendry Páez' AS name, 'MID' AS position, 10 AS jersey_number
  UNION ALL
  SELECT 'ECU' AS short_code, 'Kevin Rodríguez' AS name, 'FWD' AS position, 11 AS jersey_number
  UNION ALL
  SELECT 'ECU' AS short_code, 'Moisés Ramírez' AS name, 'GK' AS position, 12 AS jersey_number
  UNION ALL
  SELECT 'ECU' AS short_code, 'Enner Valencia' AS name, 'FWD' AS position, 13 AS jersey_number
  UNION ALL
  SELECT 'ECU' AS short_code, 'Alan Minda' AS name, 'MID' AS position, 14 AS jersey_number
  UNION ALL
  SELECT 'ECU' AS short_code, 'Pedro Vite' AS name, 'MID' AS position, 15 AS jersey_number
  UNION ALL
  SELECT 'ECU' AS short_code, 'Jordy Caicedo' AS name, 'FWD' AS position, 16 AS jersey_number
  UNION ALL
  SELECT 'ECU' AS short_code, 'Ángelo Preciado' AS name, 'DEF' AS position, 17 AS jersey_number
  UNION ALL
  SELECT 'ECU' AS short_code, 'Denil Castillo' AS name, 'MID' AS position, 18 AS jersey_number
  UNION ALL
  SELECT 'ECU' AS short_code, 'Gonzalo Plata' AS name, 'FWD' AS position, 19 AS jersey_number
  UNION ALL
  SELECT 'ECU' AS short_code, 'Nilson Angulo' AS name, 'FWD' AS position, 20 AS jersey_number
  UNION ALL
  SELECT 'ECU' AS short_code, 'Alan Franco' AS name, 'MID' AS position, 21 AS jersey_number
  UNION ALL
  SELECT 'ECU' AS short_code, 'Gonzalo Valle' AS name, 'GK' AS position, 22 AS jersey_number
  UNION ALL
  SELECT 'ECU' AS short_code, 'Moisés Caicedo' AS name, 'MID' AS position, 23 AS jersey_number
  UNION ALL
  SELECT 'ECU' AS short_code, 'Jeremy Arévalo' AS name, 'FWD' AS position, 24 AS jersey_number
  UNION ALL
  SELECT 'ECU' AS short_code, 'Jackson Porozo' AS name, 'DEF' AS position, 25 AS jersey_number
  UNION ALL
  SELECT 'ECU' AS short_code, 'Yaimar Medina' AS name, 'DEF' AS position, 26 AS jersey_number
  UNION ALL
  SELECT 'GER' AS short_code, 'Manuel Neuer' AS name, 'GK' AS position, 1 AS jersey_number
  UNION ALL
  SELECT 'GER' AS short_code, 'Antonio Rüdiger' AS name, 'DEF' AS position, 2 AS jersey_number
  UNION ALL
  SELECT 'GER' AS short_code, 'Waldemar Anton' AS name, 'DEF' AS position, 3 AS jersey_number
  UNION ALL
  SELECT 'GER' AS short_code, 'Jonathan Tah' AS name, 'DEF' AS position, 4 AS jersey_number
  UNION ALL
  SELECT 'GER' AS short_code, 'Aleksandar Pavlović' AS name, 'MID' AS position, 5 AS jersey_number
  UNION ALL
  SELECT 'GER' AS short_code, 'Joshua Kimmich' AS name, 'DEF' AS position, 6 AS jersey_number
  UNION ALL
  SELECT 'GER' AS short_code, 'Kai Havertz' AS name, 'FWD' AS position, 7 AS jersey_number
  UNION ALL
  SELECT 'GER' AS short_code, 'Leon Goretzka' AS name, 'MID' AS position, 8 AS jersey_number
  UNION ALL
  SELECT 'GER' AS short_code, 'Jamie Leweling' AS name, 'MID' AS position, 9 AS jersey_number
  UNION ALL
  SELECT 'GER' AS short_code, 'Jamal Musiala' AS name, 'MID' AS position, 10 AS jersey_number
  UNION ALL
  SELECT 'GER' AS short_code, 'Nick Woltemade' AS name, 'FWD' AS position, 11 AS jersey_number
  UNION ALL
  SELECT 'GER' AS short_code, 'Oliver Baumann' AS name, 'GK' AS position, 12 AS jersey_number
  UNION ALL
  SELECT 'GER' AS short_code, 'Pascal Groß' AS name, 'MID' AS position, 13 AS jersey_number
  UNION ALL
  SELECT 'GER' AS short_code, 'Maximilian Beier' AS name, 'FWD' AS position, 14 AS jersey_number
  UNION ALL
  SELECT 'GER' AS short_code, 'Nico Schlotterbeck' AS name, 'DEF' AS position, 15 AS jersey_number
  UNION ALL
  SELECT 'GER' AS short_code, 'Angelo Stiller' AS name, 'MID' AS position, 16 AS jersey_number
  UNION ALL
  SELECT 'GER' AS short_code, 'Florian Wirtz' AS name, 'MID' AS position, 17 AS jersey_number
  UNION ALL
  SELECT 'GER' AS short_code, 'Nathaniel Brown' AS name, 'DEF' AS position, 18 AS jersey_number
  UNION ALL
  SELECT 'GER' AS short_code, 'Leroy Sané' AS name, 'MID' AS position, 19 AS jersey_number
  UNION ALL
  SELECT 'GER' AS short_code, 'Nadiem Amiri' AS name, 'MID' AS position, 20 AS jersey_number
  UNION ALL
  SELECT 'GER' AS short_code, 'Alexander Nübel' AS name, 'GK' AS position, 21 AS jersey_number
  UNION ALL
  SELECT 'GER' AS short_code, 'David Raum' AS name, 'DEF' AS position, 22 AS jersey_number
  UNION ALL
  SELECT 'GER' AS short_code, 'Felix Nmecha' AS name, 'MID' AS position, 23 AS jersey_number
  UNION ALL
  SELECT 'GER' AS short_code, 'Malick Thiaw' AS name, 'DEF' AS position, 24 AS jersey_number
  UNION ALL
  SELECT 'GER' AS short_code, 'Assan Ouédraogo' AS name, 'MID' AS position, 25 AS jersey_number
  UNION ALL
  SELECT 'GER' AS short_code, 'Deniz Undav' AS name, 'FWD' AS position, 26 AS jersey_number
  UNION ALL
  SELECT 'CIV' AS short_code, 'Yahia Fofana' AS name, 'GK' AS position, 1 AS jersey_number
  UNION ALL
  SELECT 'CIV' AS short_code, 'Ousmane Diomande' AS name, 'DEF' AS position, 2 AS jersey_number
  UNION ALL
  SELECT 'CIV' AS short_code, 'Ghislain Konan' AS name, 'DEF' AS position, 3 AS jersey_number
  UNION ALL
  SELECT 'CIV' AS short_code, 'Jean Michaël Seri' AS name, 'MID' AS position, 4 AS jersey_number
  UNION ALL
  SELECT 'CIV' AS short_code, 'Wilfried Singo' AS name, 'DEF' AS position, 5 AS jersey_number
  UNION ALL
  SELECT 'CIV' AS short_code, 'Seko Fofana' AS name, 'MID' AS position, 6 AS jersey_number
  UNION ALL
  SELECT 'CIV' AS short_code, 'Odilon Kossounou' AS name, 'DEF' AS position, 7 AS jersey_number
  UNION ALL
  SELECT 'CIV' AS short_code, 'Franck Kessié' AS name, 'MID' AS position, 8 AS jersey_number
  UNION ALL
  SELECT 'CIV' AS short_code, 'Ange-Yoan Bonny' AS name, 'FWD' AS position, 9 AS jersey_number
  UNION ALL
  SELECT 'CIV' AS short_code, 'Simon Adingra' AS name, 'FWD' AS position, 10 AS jersey_number
  UNION ALL
  SELECT 'CIV' AS short_code, 'Yan Diomande' AS name, 'FWD' AS position, 11 AS jersey_number
  UNION ALL
  SELECT 'CIV' AS short_code, 'Elye Wahi' AS name, 'FWD' AS position, 12 AS jersey_number
  UNION ALL
  SELECT 'CIV' AS short_code, 'Christopher Opéri' AS name, 'DEF' AS position, 13 AS jersey_number
  UNION ALL
  SELECT 'CIV' AS short_code, 'Oumar Diakité' AS name, 'FWD' AS position, 14 AS jersey_number
  UNION ALL
  SELECT 'CIV' AS short_code, 'Amad Diallo' AS name, 'FWD' AS position, 15 AS jersey_number
  UNION ALL
  SELECT 'CIV' AS short_code, 'Mohamed Koné' AS name, 'GK' AS position, 16 AS jersey_number
  UNION ALL
  SELECT 'CIV' AS short_code, 'Guéla Doué' AS name, 'DEF' AS position, 17 AS jersey_number
  UNION ALL
  SELECT 'CIV' AS short_code, 'Ibrahim Sangaré' AS name, 'MID' AS position, 18 AS jersey_number
  UNION ALL
  SELECT 'CIV' AS short_code, 'Nicolas Pépé' AS name, 'FWD' AS position, 19 AS jersey_number
  UNION ALL
  SELECT 'CIV' AS short_code, 'Emmanuel Agbadou' AS name, 'DEF' AS position, 20 AS jersey_number
  UNION ALL
  SELECT 'CIV' AS short_code, 'Evan Ndicka' AS name, 'DEF' AS position, 21 AS jersey_number
  UNION ALL
  SELECT 'CIV' AS short_code, 'Evann Guessand' AS name, 'FWD' AS position, 22 AS jersey_number
  UNION ALL
  SELECT 'CIV' AS short_code, 'Alban Lafont' AS name, 'GK' AS position, 23 AS jersey_number
  UNION ALL
  SELECT 'CIV' AS short_code, 'Bazoumana Touré' AS name, 'FWD' AS position, 24 AS jersey_number
  UNION ALL
  SELECT 'CIV' AS short_code, 'Parfait Guiagon' AS name, 'MID' AS position, 25 AS jersey_number
  UNION ALL
  SELECT 'CIV' AS short_code, 'Christ Inao Oulaï' AS name, 'MID' AS position, 26 AS jersey_number
  UNION ALL
  SELECT 'JPN' AS short_code, 'Zion Suzuki' AS name, 'GK' AS position, 1 AS jersey_number
  UNION ALL
  SELECT 'JPN' AS short_code, 'Yukinari Sugawara' AS name, 'DEF' AS position, 2 AS jersey_number
  UNION ALL
  SELECT 'JPN' AS short_code, 'Shōgo Taniguchi' AS name, 'DEF' AS position, 3 AS jersey_number
  UNION ALL
  SELECT 'JPN' AS short_code, 'Kō Itakura' AS name, 'DEF' AS position, 4 AS jersey_number
  UNION ALL
  SELECT 'JPN' AS short_code, 'Yūto Nagatomo' AS name, 'DEF' AS position, 5 AS jersey_number
  UNION ALL
  SELECT 'JPN' AS short_code, 'Shuto Machino' AS name, 'FWD' AS position, 6 AS jersey_number
  UNION ALL
  SELECT 'JPN' AS short_code, 'Ao Tanaka' AS name, 'MID' AS position, 7 AS jersey_number
  UNION ALL
  SELECT 'JPN' AS short_code, 'Takefusa Kubo' AS name, 'MID' AS position, 8 AS jersey_number
  UNION ALL
  SELECT 'JPN' AS short_code, 'Keisuke Gotō' AS name, 'FWD' AS position, 9 AS jersey_number
  UNION ALL
  SELECT 'JPN' AS short_code, 'Ritsu Dōan' AS name, 'MID' AS position, 10 AS jersey_number
  UNION ALL
  SELECT 'JPN' AS short_code, 'Daizen Maeda' AS name, 'MID' AS position, 11 AS jersey_number
  UNION ALL
  SELECT 'JPN' AS short_code, 'Keisuke Ōsako' AS name, 'GK' AS position, 12 AS jersey_number
  UNION ALL
  SELECT 'JPN' AS short_code, 'Keito Nakamura' AS name, 'MID' AS position, 13 AS jersey_number
  UNION ALL
  SELECT 'JPN' AS short_code, 'Junya Itō' AS name, 'MID' AS position, 14 AS jersey_number
  UNION ALL
  SELECT 'JPN' AS short_code, 'Daichi Kamada' AS name, 'MID' AS position, 15 AS jersey_number
  UNION ALL
  SELECT 'JPN' AS short_code, 'Tsuyoshi Watanabe' AS name, 'DEF' AS position, 16 AS jersey_number
  UNION ALL
  SELECT 'JPN' AS short_code, 'Yuito Suzuki' AS name, 'MID' AS position, 17 AS jersey_number
  UNION ALL
  SELECT 'JPN' AS short_code, 'Ayase Ueda' AS name, 'FWD' AS position, 18 AS jersey_number
  UNION ALL
  SELECT 'JPN' AS short_code, 'Kōki Ogawa' AS name, 'FWD' AS position, 19 AS jersey_number
  UNION ALL
  SELECT 'JPN' AS short_code, 'Ayumu Seko' AS name, 'DEF' AS position, 20 AS jersey_number
  UNION ALL
  SELECT 'JPN' AS short_code, 'Hiroki Itō' AS name, 'DEF' AS position, 21 AS jersey_number
  UNION ALL
  SELECT 'JPN' AS short_code, 'Takehiro Tomiyasu' AS name, 'DEF' AS position, 22 AS jersey_number
  UNION ALL
  SELECT 'JPN' AS short_code, 'Tomoki Hayakawa' AS name, 'GK' AS position, 23 AS jersey_number
  UNION ALL
  SELECT 'JPN' AS short_code, 'Kaishū Sano' AS name, 'MID' AS position, 24 AS jersey_number
  UNION ALL
  SELECT 'JPN' AS short_code, 'Junnosuke Suzuki' AS name, 'DEF' AS position, 25 AS jersey_number
  UNION ALL
  SELECT 'JPN' AS short_code, 'Kento Shiogai' AS name, 'FWD' AS position, 26 AS jersey_number
  UNION ALL
  SELECT 'NED' AS short_code, 'Bart Verbruggen' AS name, 'GK' AS position, 1 AS jersey_number
  UNION ALL
  SELECT 'NED' AS short_code, 'Lutsharel Geertruida' AS name, 'DEF' AS position, 2 AS jersey_number
  UNION ALL
  SELECT 'NED' AS short_code, 'Marten de Roon' AS name, 'MID' AS position, 3 AS jersey_number
  UNION ALL
  SELECT 'NED' AS short_code, 'Virgil van Dijk' AS name, 'DEF' AS position, 4 AS jersey_number
  UNION ALL
  SELECT 'NED' AS short_code, 'Nathan Aké' AS name, 'DEF' AS position, 5 AS jersey_number
  UNION ALL
  SELECT 'NED' AS short_code, 'Jan Paul van Hecke' AS name, 'DEF' AS position, 6 AS jersey_number
  UNION ALL
  SELECT 'NED' AS short_code, 'Justin Kluivert' AS name, 'MID' AS position, 7 AS jersey_number
  UNION ALL
  SELECT 'NED' AS short_code, 'Ryan Gravenberch' AS name, 'MID' AS position, 8 AS jersey_number
  UNION ALL
  SELECT 'NED' AS short_code, 'Wout Weghorst' AS name, 'FWD' AS position, 9 AS jersey_number
  UNION ALL
  SELECT 'NED' AS short_code, 'Memphis Depay' AS name, 'FWD' AS position, 10 AS jersey_number
  UNION ALL
  SELECT 'NED' AS short_code, 'Cody Gakpo' AS name, 'FWD' AS position, 11 AS jersey_number
  UNION ALL
  SELECT 'NED' AS short_code, 'Mats Wieffer' AS name, 'DEF' AS position, 12 AS jersey_number
  UNION ALL
  SELECT 'NED' AS short_code, 'Robin Roefs' AS name, 'GK' AS position, 13 AS jersey_number
  UNION ALL
  SELECT 'NED' AS short_code, 'Tijjani Reijnders' AS name, 'MID' AS position, 14 AS jersey_number
  UNION ALL
  SELECT 'NED' AS short_code, 'Micky van de Ven' AS name, 'DEF' AS position, 15 AS jersey_number
  UNION ALL
  SELECT 'NED' AS short_code, 'Guus Til' AS name, 'MID' AS position, 16 AS jersey_number
  UNION ALL
  SELECT 'NED' AS short_code, 'Noa Lang' AS name, 'FWD' AS position, 17 AS jersey_number
  UNION ALL
  SELECT 'NED' AS short_code, 'Donyell Malen' AS name, 'FWD' AS position, 18 AS jersey_number
  UNION ALL
  SELECT 'NED' AS short_code, 'Brian Brobbey' AS name, 'FWD' AS position, 19 AS jersey_number
  UNION ALL
  SELECT 'NED' AS short_code, 'Teun Koopmeiners' AS name, 'MID' AS position, 20 AS jersey_number
  UNION ALL
  SELECT 'NED' AS short_code, 'Frenkie de Jong' AS name, 'MID' AS position, 21 AS jersey_number
  UNION ALL
  SELECT 'NED' AS short_code, 'Denzel Dumfries' AS name, 'DEF' AS position, 22 AS jersey_number
  UNION ALL
  SELECT 'NED' AS short_code, 'Mark Flekken' AS name, 'GK' AS position, 23 AS jersey_number
  UNION ALL
  SELECT 'NED' AS short_code, 'Crysencio Summerville' AS name, 'FWD' AS position, 24 AS jersey_number
  UNION ALL
  SELECT 'NED' AS short_code, 'Jorrel Hato' AS name, 'DEF' AS position, 25 AS jersey_number
  UNION ALL
  SELECT 'NED' AS short_code, 'Quinten Timber' AS name, 'MID' AS position, 26 AS jersey_number
  UNION ALL
  SELECT 'SWE' AS short_code, 'Jacob Widell Zetterström' AS name, 'GK' AS position, 1 AS jersey_number
  UNION ALL
  SELECT 'SWE' AS short_code, 'Gustaf Lagerbielke' AS name, 'DEF' AS position, 2 AS jersey_number
  UNION ALL
  SELECT 'SWE' AS short_code, 'Victor Lindelöf' AS name, 'DEF' AS position, 3 AS jersey_number
  UNION ALL
  SELECT 'SWE' AS short_code, 'Isak Hien' AS name, 'DEF' AS position, 4 AS jersey_number
  UNION ALL
  SELECT 'SWE' AS short_code, 'Gabriel Gudmundsson' AS name, 'DEF' AS position, 5 AS jersey_number
  UNION ALL
  SELECT 'SWE' AS short_code, 'Herman Johansson' AS name, 'DEF' AS position, 6 AS jersey_number
  UNION ALL
  SELECT 'SWE' AS short_code, 'Lucas Bergvall' AS name, 'MID' AS position, 7 AS jersey_number
  UNION ALL
  SELECT 'SWE' AS short_code, 'Daniel Svensson' AS name, 'DEF' AS position, 8 AS jersey_number
  UNION ALL
  SELECT 'SWE' AS short_code, 'Alexander Isak' AS name, 'FWD' AS position, 9 AS jersey_number
  UNION ALL
  SELECT 'SWE' AS short_code, 'Benjamin Nygren' AS name, 'MID' AS position, 10 AS jersey_number
  UNION ALL
  SELECT 'SWE' AS short_code, 'Anthony Elanga' AS name, 'FWD' AS position, 11 AS jersey_number
  UNION ALL
  SELECT 'SWE' AS short_code, 'Viktor Johansson' AS name, 'GK' AS position, 12 AS jersey_number
  UNION ALL
  SELECT 'SWE' AS short_code, 'Ken Sema' AS name, 'MID' AS position, 13 AS jersey_number
  UNION ALL
  SELECT 'SWE' AS short_code, 'Hjalmar Ekdal' AS name, 'DEF' AS position, 14 AS jersey_number
  UNION ALL
  SELECT 'SWE' AS short_code, 'Carl Starfelt' AS name, 'DEF' AS position, 15 AS jersey_number
  UNION ALL
  SELECT 'SWE' AS short_code, 'Jesper Karlström' AS name, 'MID' AS position, 16 AS jersey_number
  UNION ALL
  SELECT 'SWE' AS short_code, 'Viktor Gyökeres' AS name, 'FWD' AS position, 17 AS jersey_number
  UNION ALL
  SELECT 'SWE' AS short_code, 'Yasin Ayari' AS name, 'MID' AS position, 18 AS jersey_number
  UNION ALL
  SELECT 'SWE' AS short_code, 'Mattias Svanberg' AS name, 'MID' AS position, 19 AS jersey_number
  UNION ALL
  SELECT 'SWE' AS short_code, 'Eric Smith' AS name, 'DEF' AS position, 20 AS jersey_number
  UNION ALL
  SELECT 'SWE' AS short_code, 'Alexander Bernhardsson' AS name, 'DEF' AS position, 21 AS jersey_number
  UNION ALL
  SELECT 'SWE' AS short_code, 'Besfort Zeneli' AS name, 'MID' AS position, 22 AS jersey_number
  UNION ALL
  SELECT 'SWE' AS short_code, 'Kristoffer Nordfeldt' AS name, 'GK' AS position, 23 AS jersey_number
  UNION ALL
  SELECT 'SWE' AS short_code, 'Elliot Stroud' AS name, 'DEF' AS position, 24 AS jersey_number
  UNION ALL
  SELECT 'SWE' AS short_code, 'Gustaf Nilsson' AS name, 'FWD' AS position, 25 AS jersey_number
  UNION ALL
  SELECT 'SWE' AS short_code, 'Taha Ali' AS name, 'FWD' AS position, 26 AS jersey_number
  UNION ALL
  SELECT 'TUN' AS short_code, 'Mouhib Chamakh' AS name, 'GK' AS position, 1 AS jersey_number
  UNION ALL
  SELECT 'TUN' AS short_code, 'Ali Abdi' AS name, 'DEF' AS position, 2 AS jersey_number
  UNION ALL
  SELECT 'TUN' AS short_code, 'Montassar Talbi' AS name, 'DEF' AS position, 3 AS jersey_number
  UNION ALL
  SELECT 'TUN' AS short_code, 'Omar Rekik' AS name, 'DEF' AS position, 4 AS jersey_number
  UNION ALL
  SELECT 'TUN' AS short_code, 'Adem Arous' AS name, 'DEF' AS position, 5 AS jersey_number
  UNION ALL
  SELECT 'TUN' AS short_code, 'Dylan Bronn' AS name, 'DEF' AS position, 6 AS jersey_number
  UNION ALL
  SELECT 'TUN' AS short_code, 'Elias Achouri' AS name, 'FWD' AS position, 7 AS jersey_number
  UNION ALL
  SELECT 'TUN' AS short_code, 'Elias Saad' AS name, 'FWD' AS position, 8 AS jersey_number
  UNION ALL
  SELECT 'TUN' AS short_code, 'Hazem Mastouri' AS name, 'FWD' AS position, 9 AS jersey_number
  UNION ALL
  SELECT 'TUN' AS short_code, 'Hannibal Mejbri' AS name, 'MID' AS position, 10 AS jersey_number
  UNION ALL
  SELECT 'TUN' AS short_code, 'Ismaël Gharbi' AS name, 'MID' AS position, 11 AS jersey_number
  UNION ALL
  SELECT 'TUN' AS short_code, 'Mortadha Ben Ouanes' AS name, 'DEF' AS position, 12 AS jersey_number
  UNION ALL
  SELECT 'TUN' AS short_code, 'Rani Khedira' AS name, 'MID' AS position, 13 AS jersey_number
  UNION ALL
  SELECT 'TUN' AS short_code, 'Khalil Ayari' AS name, 'MID' AS position, 14 AS jersey_number
  UNION ALL
  SELECT 'TUN' AS short_code, 'Hadj Mahmoud' AS name, 'MID' AS position, 15 AS jersey_number
  UNION ALL
  SELECT 'TUN' AS short_code, 'Aymen Dahmen' AS name, 'GK' AS position, 16 AS jersey_number
  UNION ALL
  SELECT 'TUN' AS short_code, 'Ellyes Skhiri' AS name, 'MID' AS position, 17 AS jersey_number
  UNION ALL
  SELECT 'TUN' AS short_code, 'Rayan Elloumi' AS name, 'FWD' AS position, 18 AS jersey_number
  UNION ALL
  SELECT 'TUN' AS short_code, 'Firas Chaouat' AS name, 'FWD' AS position, 19 AS jersey_number
  UNION ALL
  SELECT 'TUN' AS short_code, 'Yan Valery' AS name, 'DEF' AS position, 20 AS jersey_number
  UNION ALL
  SELECT 'TUN' AS short_code, 'Mohamed Amine Ben Hamida' AS name, 'DEF' AS position, 21 AS jersey_number
  UNION ALL
  SELECT 'TUN' AS short_code, 'Sabri Ben Hessen' AS name, 'GK' AS position, 22 AS jersey_number
  UNION ALL
  SELECT 'TUN' AS short_code, 'Moutaz Neffati' AS name, 'DEF' AS position, 23 AS jersey_number
  UNION ALL
  SELECT 'TUN' AS short_code, 'Raed Chikhaoui' AS name, 'DEF' AS position, 24 AS jersey_number
  UNION ALL
  SELECT 'TUN' AS short_code, 'Anis Ben Slimane' AS name, 'MID' AS position, 25 AS jersey_number
  UNION ALL
  SELECT 'TUN' AS short_code, 'Sebastian Tounekti' AS name, 'MID' AS position, 26 AS jersey_number
  UNION ALL
  SELECT 'BEL' AS short_code, 'Thibaut Courtois' AS name, 'GK' AS position, 1 AS jersey_number
  UNION ALL
  SELECT 'BEL' AS short_code, 'Zeno Debast' AS name, 'DEF' AS position, 2 AS jersey_number
  UNION ALL
  SELECT 'BEL' AS short_code, 'Arthur Theate' AS name, 'DEF' AS position, 3 AS jersey_number
  UNION ALL
  SELECT 'BEL' AS short_code, 'Brandon Mechele' AS name, 'DEF' AS position, 4 AS jersey_number
  UNION ALL
  SELECT 'BEL' AS short_code, 'Maxim De Cuyper' AS name, 'DEF' AS position, 5 AS jersey_number
  UNION ALL
  SELECT 'BEL' AS short_code, 'Axel Witsel' AS name, 'MID' AS position, 6 AS jersey_number
  UNION ALL
  SELECT 'BEL' AS short_code, 'Kevin De Bruyne' AS name, 'MID' AS position, 7 AS jersey_number
  UNION ALL
  SELECT 'BEL' AS short_code, 'Youri Tielemans' AS name, 'MID' AS position, 8 AS jersey_number
  UNION ALL
  SELECT 'BEL' AS short_code, 'Romelu Lukaku' AS name, 'FWD' AS position, 9 AS jersey_number
  UNION ALL
  SELECT 'BEL' AS short_code, 'Leandro Trossard' AS name, 'FWD' AS position, 10 AS jersey_number
  UNION ALL
  SELECT 'BEL' AS short_code, 'Jérémy Doku' AS name, 'FWD' AS position, 11 AS jersey_number
  UNION ALL
  SELECT 'BEL' AS short_code, 'Senne Lammens' AS name, 'GK' AS position, 12 AS jersey_number
  UNION ALL
  SELECT 'BEL' AS short_code, 'Mike Penders' AS name, 'GK' AS position, 13 AS jersey_number
  UNION ALL
  SELECT 'BEL' AS short_code, 'Dodi Lukébakio' AS name, 'FWD' AS position, 14 AS jersey_number
  UNION ALL
  SELECT 'BEL' AS short_code, 'Thomas Meunier' AS name, 'DEF' AS position, 15 AS jersey_number
  UNION ALL
  SELECT 'BEL' AS short_code, 'Koni De Winter' AS name, 'DEF' AS position, 16 AS jersey_number
  UNION ALL
  SELECT 'BEL' AS short_code, 'Charles De Ketelaere' AS name, 'FWD' AS position, 17 AS jersey_number
  UNION ALL
  SELECT 'BEL' AS short_code, 'Joaquin Seys' AS name, 'DEF' AS position, 18 AS jersey_number
  UNION ALL
  SELECT 'BEL' AS short_code, 'Diego Moreira' AS name, 'MID' AS position, 19 AS jersey_number
  UNION ALL
  SELECT 'BEL' AS short_code, 'Hans Vanaken' AS name, 'MID' AS position, 20 AS jersey_number
  UNION ALL
  SELECT 'BEL' AS short_code, 'Timothy Castagne' AS name, 'DEF' AS position, 21 AS jersey_number
  UNION ALL
  SELECT 'BEL' AS short_code, 'Alexis Saelemaekers' AS name, 'MID' AS position, 22 AS jersey_number
  UNION ALL
  SELECT 'BEL' AS short_code, 'Nicolas Raskin' AS name, 'MID' AS position, 23 AS jersey_number
  UNION ALL
  SELECT 'BEL' AS short_code, 'Amadou Onana' AS name, 'MID' AS position, 24 AS jersey_number
  UNION ALL
  SELECT 'BEL' AS short_code, 'Nathan Ngoy' AS name, 'DEF' AS position, 25 AS jersey_number
  UNION ALL
  SELECT 'BEL' AS short_code, 'Matias Fernandez-Pardo' AS name, 'FWD' AS position, 26 AS jersey_number
  UNION ALL
  SELECT 'EGY' AS short_code, 'Mohamed El Shenawy' AS name, 'GK' AS position, 1 AS jersey_number
  UNION ALL
  SELECT 'EGY' AS short_code, 'Yasser Ibrahim' AS name, 'DEF' AS position, 2 AS jersey_number
  UNION ALL
  SELECT 'EGY' AS short_code, 'Mohamed Hany' AS name, 'DEF' AS position, 3 AS jersey_number
  UNION ALL
  SELECT 'EGY' AS short_code, 'Hossam Abdelmaguid' AS name, 'DEF' AS position, 4 AS jersey_number
  UNION ALL
  SELECT 'EGY' AS short_code, 'Ramy Rabia' AS name, 'DEF' AS position, 5 AS jersey_number
  UNION ALL
  SELECT 'EGY' AS short_code, 'Mohamed Abdelmonem' AS name, 'DEF' AS position, 6 AS jersey_number
  UNION ALL
  SELECT 'EGY' AS short_code, 'Trézéguet' AS name, 'FWD' AS position, 7 AS jersey_number
  UNION ALL
  SELECT 'EGY' AS short_code, 'Emam Ashour' AS name, 'MID' AS position, 8 AS jersey_number
  UNION ALL
  SELECT 'EGY' AS short_code, 'Hamza Abdelkarim' AS name, 'FWD' AS position, 9 AS jersey_number
  UNION ALL
  SELECT 'EGY' AS short_code, 'Mohamed Salah' AS name, 'FWD' AS position, 10 AS jersey_number
  UNION ALL
  SELECT 'EGY' AS short_code, 'Mostafa Ziko' AS name, 'MID' AS position, 11 AS jersey_number
  UNION ALL
  SELECT 'EGY' AS short_code, 'Haissem Hassan' AS name, 'FWD' AS position, 12 AS jersey_number
  UNION ALL
  SELECT 'EGY' AS short_code, 'Ahmed Fatouh' AS name, 'DEF' AS position, 13 AS jersey_number
  UNION ALL
  SELECT 'EGY' AS short_code, 'Hamdy Fathy' AS name, 'MID' AS position, 14 AS jersey_number
  UNION ALL
  SELECT 'EGY' AS short_code, 'Karim Hafez' AS name, 'DEF' AS position, 15 AS jersey_number
  UNION ALL
  SELECT 'EGY' AS short_code, 'El Mahdy Soliman' AS name, 'GK' AS position, 16 AS jersey_number
  UNION ALL
  SELECT 'EGY' AS short_code, 'Mohanad Lasheen' AS name, 'MID' AS position, 17 AS jersey_number
  UNION ALL
  SELECT 'EGY' AS short_code, 'Nabil Emad' AS name, 'MID' AS position, 18 AS jersey_number
  UNION ALL
  SELECT 'EGY' AS short_code, 'Marwan Attia' AS name, 'MID' AS position, 19 AS jersey_number
  UNION ALL
  SELECT 'EGY' AS short_code, 'Ibrahim Adel' AS name, 'FWD' AS position, 20 AS jersey_number
  UNION ALL
  SELECT 'EGY' AS short_code, 'Mahmoud Saber' AS name, 'MID' AS position, 21 AS jersey_number
  UNION ALL
  SELECT 'EGY' AS short_code, 'Omar Marmoush' AS name, 'FWD' AS position, 22 AS jersey_number
  UNION ALL
  SELECT 'EGY' AS short_code, 'Mostafa Shobeir' AS name, 'GK' AS position, 23 AS jersey_number
  UNION ALL
  SELECT 'EGY' AS short_code, 'Tarek Alaa' AS name, 'DEF' AS position, 24 AS jersey_number
  UNION ALL
  SELECT 'EGY' AS short_code, 'Zizo' AS name, 'FWD' AS position, 25 AS jersey_number
  UNION ALL
  SELECT 'EGY' AS short_code, 'Mohamed Alaa' AS name, 'GK' AS position, 26 AS jersey_number
  UNION ALL
  SELECT 'IRN' AS short_code, 'Alireza Beiranvand' AS name, 'GK' AS position, 1 AS jersey_number
  UNION ALL
  SELECT 'IRN' AS short_code, 'Saleh Hardani' AS name, 'DEF' AS position, 2 AS jersey_number
  UNION ALL
  SELECT 'IRN' AS short_code, 'Ehsan Hajsafi' AS name, 'DEF' AS position, 3 AS jersey_number
  UNION ALL
  SELECT 'IRN' AS short_code, 'Shojae Khalilzadeh' AS name, 'DEF' AS position, 4 AS jersey_number
  UNION ALL
  SELECT 'IRN' AS short_code, 'Milad Mohammadi' AS name, 'DEF' AS position, 5 AS jersey_number
  UNION ALL
  SELECT 'IRN' AS short_code, 'Saeid Ezatolahi' AS name, 'MID' AS position, 6 AS jersey_number
  UNION ALL
  SELECT 'IRN' AS short_code, 'Alireza Jahanbakhsh' AS name, 'MID' AS position, 7 AS jersey_number
  UNION ALL
  SELECT 'IRN' AS short_code, 'Mohammad Mohebi' AS name, 'MID' AS position, 8 AS jersey_number
  UNION ALL
  SELECT 'IRN' AS short_code, 'Mehdi Taremi' AS name, 'FWD' AS position, 9 AS jersey_number
  UNION ALL
  SELECT 'IRN' AS short_code, 'Mehdi Ghayedi' AS name, 'FWD' AS position, 10 AS jersey_number
  UNION ALL
  SELECT 'IRN' AS short_code, 'Ali Alipour' AS name, 'FWD' AS position, 11 AS jersey_number
  UNION ALL
  SELECT 'IRN' AS short_code, 'Payam Niazmand' AS name, 'GK' AS position, 12 AS jersey_number
  UNION ALL
  SELECT 'IRN' AS short_code, 'Hossein Kanaanizadegan' AS name, 'DEF' AS position, 13 AS jersey_number
  UNION ALL
  SELECT 'IRN' AS short_code, 'Saman Ghoddos' AS name, 'MID' AS position, 14 AS jersey_number
  UNION ALL
  SELECT 'IRN' AS short_code, 'Rouzbeh Cheshmi' AS name, 'MID' AS position, 15 AS jersey_number
  UNION ALL
  SELECT 'IRN' AS short_code, 'Mehdi Torabi' AS name, 'MID' AS position, 16 AS jersey_number
  UNION ALL
  SELECT 'IRN' AS short_code, 'Aria Yousefi' AS name, 'DEF' AS position, 17 AS jersey_number
  UNION ALL
  SELECT 'IRN' AS short_code, 'Amirhossein Hosseinzadeh' AS name, 'FWD' AS position, 18 AS jersey_number
  UNION ALL
  SELECT 'IRN' AS short_code, 'Ali Nemati' AS name, 'DEF' AS position, 19 AS jersey_number
  UNION ALL
  SELECT 'IRN' AS short_code, 'Shahriyar Moghanlou' AS name, 'FWD' AS position, 20 AS jersey_number
  UNION ALL
  SELECT 'IRN' AS short_code, 'Mohammad Ghorbani' AS name, 'MID' AS position, 21 AS jersey_number
  UNION ALL
  SELECT 'IRN' AS short_code, 'Hossein Hosseini' AS name, 'GK' AS position, 22 AS jersey_number
  UNION ALL
  SELECT 'IRN' AS short_code, 'Ramin Rezaeian' AS name, 'DEF' AS position, 23 AS jersey_number
  UNION ALL
  SELECT 'IRN' AS short_code, 'Dennis Eckert' AS name, 'FWD' AS position, 24 AS jersey_number
  UNION ALL
  SELECT 'IRN' AS short_code, 'Danial Eiri' AS name, 'DEF' AS position, 25 AS jersey_number
  UNION ALL
  SELECT 'IRN' AS short_code, 'Amirmohammad Razzaghinia' AS name, 'MID' AS position, 26 AS jersey_number
  UNION ALL
  SELECT 'NZL' AS short_code, 'Max Crocombe' AS name, 'GK' AS position, 1 AS jersey_number
  UNION ALL
  SELECT 'NZL' AS short_code, 'Tim Payne' AS name, 'DEF' AS position, 2 AS jersey_number
  UNION ALL
  SELECT 'NZL' AS short_code, 'Francis de Vries' AS name, 'DEF' AS position, 3 AS jersey_number
  UNION ALL
  SELECT 'NZL' AS short_code, 'Tyler Bindon' AS name, 'DEF' AS position, 4 AS jersey_number
  UNION ALL
  SELECT 'NZL' AS short_code, 'Michael Boxall' AS name, 'DEF' AS position, 5 AS jersey_number
  UNION ALL
  SELECT 'NZL' AS short_code, 'Joe Bell' AS name, 'MID' AS position, 6 AS jersey_number
  UNION ALL
  SELECT 'NZL' AS short_code, 'Matthew Garbett' AS name, 'MID' AS position, 7 AS jersey_number
  UNION ALL
  SELECT 'NZL' AS short_code, 'Marko Stamenić' AS name, 'MID' AS position, 8 AS jersey_number
  UNION ALL
  SELECT 'NZL' AS short_code, 'Chris Wood' AS name, 'FWD' AS position, 9 AS jersey_number
  UNION ALL
  SELECT 'NZL' AS short_code, 'Sarpreet Singh' AS name, 'MID' AS position, 10 AS jersey_number
  UNION ALL
  SELECT 'NZL' AS short_code, 'Elijah Just' AS name, 'MID' AS position, 11 AS jersey_number
  UNION ALL
  SELECT 'NZL' AS short_code, 'Alex Paulsen' AS name, 'GK' AS position, 12 AS jersey_number
  UNION ALL
  SELECT 'NZL' AS short_code, 'Liberato Cacace' AS name, 'DEF' AS position, 13 AS jersey_number
  UNION ALL
  SELECT 'NZL' AS short_code, 'Alex Rufer' AS name, 'MID' AS position, 14 AS jersey_number
  UNION ALL
  SELECT 'NZL' AS short_code, 'Nando Pijnaker' AS name, 'DEF' AS position, 15 AS jersey_number
  UNION ALL
  SELECT 'NZL' AS short_code, 'Finn Surman' AS name, 'DEF' AS position, 16 AS jersey_number
  UNION ALL
  SELECT 'NZL' AS short_code, 'Kosta Barbarouses' AS name, 'FWD' AS position, 17 AS jersey_number
  UNION ALL
  SELECT 'NZL' AS short_code, 'Ben Waine' AS name, 'FWD' AS position, 18 AS jersey_number
  UNION ALL
  SELECT 'NZL' AS short_code, 'Ben Old' AS name, 'MID' AS position, 19 AS jersey_number
  UNION ALL
  SELECT 'NZL' AS short_code, 'Callum McCowatt' AS name, 'MID' AS position, 20 AS jersey_number
  UNION ALL
  SELECT 'NZL' AS short_code, 'Jesse Randall' AS name, 'FWD' AS position, 21 AS jersey_number
  UNION ALL
  SELECT 'NZL' AS short_code, 'Michael Woud' AS name, 'GK' AS position, 22 AS jersey_number
  UNION ALL
  SELECT 'NZL' AS short_code, 'Ryan Thomas' AS name, 'MID' AS position, 23 AS jersey_number
  UNION ALL
  SELECT 'NZL' AS short_code, 'Callan Elliot' AS name, 'DEF' AS position, 24 AS jersey_number
  UNION ALL
  SELECT 'NZL' AS short_code, 'Lachlan Bayliss' AS name, 'MID' AS position, 25 AS jersey_number
  UNION ALL
  SELECT 'NZL' AS short_code, 'Tommy Smith' AS name, 'DEF' AS position, 26 AS jersey_number
  UNION ALL
  SELECT 'CPV' AS short_code, 'Vozinha' AS name, 'GK' AS position, 1 AS jersey_number
  UNION ALL
  SELECT 'CPV' AS short_code, 'Stopira' AS name, 'DEF' AS position, 2 AS jersey_number
  UNION ALL
  SELECT 'CPV' AS short_code, 'Diney' AS name, 'DEF' AS position, 3 AS jersey_number
  UNION ALL
  SELECT 'CPV' AS short_code, 'Roberto Lopes' AS name, 'DEF' AS position, 4 AS jersey_number
  UNION ALL
  SELECT 'CPV' AS short_code, 'Logan Costa' AS name, 'DEF' AS position, 5 AS jersey_number
  UNION ALL
  SELECT 'CPV' AS short_code, 'Kevin Pina' AS name, 'MID' AS position, 6 AS jersey_number
  UNION ALL
  SELECT 'CPV' AS short_code, 'Jovane Cabral' AS name, 'MID' AS position, 7 AS jersey_number
  UNION ALL
  SELECT 'CPV' AS short_code, 'João Paulo' AS name, 'MID' AS position, 8 AS jersey_number
  UNION ALL
  SELECT 'CPV' AS short_code, 'Gilson Benchimol' AS name, 'FWD' AS position, 9 AS jersey_number
  UNION ALL
  SELECT 'CPV' AS short_code, 'Jamiro Monteiro' AS name, 'MID' AS position, 10 AS jersey_number
  UNION ALL
  SELECT 'CPV' AS short_code, 'Garry Rodrigues' AS name, 'MID' AS position, 11 AS jersey_number
  UNION ALL
  SELECT 'CPV' AS short_code, 'Márcio Rosa' AS name, 'GK' AS position, 12 AS jersey_number
  UNION ALL
  SELECT 'CPV' AS short_code, 'Sidny Lopes Cabral' AS name, 'DEF' AS position, 13 AS jersey_number
  UNION ALL
  SELECT 'CPV' AS short_code, 'Deroy Duarte' AS name, 'MID' AS position, 14 AS jersey_number
  UNION ALL
  SELECT 'CPV' AS short_code, 'Laros Duarte' AS name, 'MID' AS position, 15 AS jersey_number
  UNION ALL
  SELECT 'CPV' AS short_code, 'Yannick Semedo' AS name, 'MID' AS position, 16 AS jersey_number
  UNION ALL
  SELECT 'CPV' AS short_code, 'Willy Semedo' AS name, 'MID' AS position, 17 AS jersey_number
  UNION ALL
  SELECT 'CPV' AS short_code, 'Telmo Arcanjo' AS name, 'MID' AS position, 18 AS jersey_number
  UNION ALL
  SELECT 'CPV' AS short_code, 'Dailon Livramento' AS name, 'FWD' AS position, 19 AS jersey_number
  UNION ALL
  SELECT 'CPV' AS short_code, 'Ryan Mendes' AS name, 'FWD' AS position, 20 AS jersey_number
  UNION ALL
  SELECT 'CPV' AS short_code, 'Nuno da Costa' AS name, 'MID' AS position, 21 AS jersey_number
  UNION ALL
  SELECT 'CPV' AS short_code, 'Steven Moreira' AS name, 'DEF' AS position, 22 AS jersey_number
  UNION ALL
  SELECT 'CPV' AS short_code, 'CJ dos Santos' AS name, 'GK' AS position, 23 AS jersey_number
  UNION ALL
  SELECT 'CPV' AS short_code, 'Wagner Pina' AS name, 'DEF' AS position, 24 AS jersey_number
  UNION ALL
  SELECT 'CPV' AS short_code, 'Kelvin Pires' AS name, 'DEF' AS position, 25 AS jersey_number
  UNION ALL
  SELECT 'CPV' AS short_code, 'Hélio Varela' AS name, 'MID' AS position, 26 AS jersey_number
  UNION ALL
  SELECT 'KSA' AS short_code, 'Nawaf Al-Aqidi' AS name, 'GK' AS position, 1 AS jersey_number
  UNION ALL
  SELECT 'KSA' AS short_code, 'Ali Majrashi' AS name, 'DEF' AS position, 2 AS jersey_number
  UNION ALL
  SELECT 'KSA' AS short_code, 'Ali Lajami' AS name, 'DEF' AS position, 3 AS jersey_number
  UNION ALL
  SELECT 'KSA' AS short_code, 'Abdulelah Al-Amri' AS name, 'DEF' AS position, 4 AS jersey_number
  UNION ALL
  SELECT 'KSA' AS short_code, 'Hassan Al-Tambakti' AS name, 'DEF' AS position, 5 AS jersey_number
  UNION ALL
  SELECT 'KSA' AS short_code, 'Nasser Al-Dawsari' AS name, 'MID' AS position, 6 AS jersey_number
  UNION ALL
  SELECT 'KSA' AS short_code, 'Musab Al-Juwayr' AS name, 'MID' AS position, 7 AS jersey_number
  UNION ALL
  SELECT 'KSA' AS short_code, 'Ayman Yahya' AS name, 'FWD' AS position, 8 AS jersey_number
  UNION ALL
  SELECT 'KSA' AS short_code, 'Firas Al-Buraikan' AS name, 'FWD' AS position, 9 AS jersey_number
  UNION ALL
  SELECT 'KSA' AS short_code, 'Salem Al-Dawsari' AS name, 'FWD' AS position, 10 AS jersey_number
  UNION ALL
  SELECT 'KSA' AS short_code, 'Saleh Al-Shehri' AS name, 'FWD' AS position, 11 AS jersey_number
  UNION ALL
  SELECT 'KSA' AS short_code, 'Saud Abdulhamid' AS name, 'DEF' AS position, 12 AS jersey_number
  UNION ALL
  SELECT 'KSA' AS short_code, 'Nawaf Boushal' AS name, 'DEF' AS position, 13 AS jersey_number
  UNION ALL
  SELECT 'KSA' AS short_code, 'Hassan Kadesh' AS name, 'DEF' AS position, 14 AS jersey_number
  UNION ALL
  SELECT 'KSA' AS short_code, 'Abdullah Al-Khaibari' AS name, 'MID' AS position, 15 AS jersey_number
  UNION ALL
  SELECT 'KSA' AS short_code, 'Ziyad Al-Johani' AS name, 'MID' AS position, 16 AS jersey_number
  UNION ALL
  SELECT 'KSA' AS short_code, 'Khalid Al-Ghannam' AS name, 'FWD' AS position, 17 AS jersey_number
  UNION ALL
  SELECT 'KSA' AS short_code, 'Alaa Al-Hejji' AS name, 'MID' AS position, 18 AS jersey_number
  UNION ALL
  SELECT 'KSA' AS short_code, 'Abdullah Al-Hamdan' AS name, 'FWD' AS position, 19 AS jersey_number
  UNION ALL
  SELECT 'KSA' AS short_code, 'Sultan Mandash' AS name, 'FWD' AS position, 20 AS jersey_number
  UNION ALL
  SELECT 'KSA' AS short_code, 'Mohammed Al-Owais' AS name, 'GK' AS position, 21 AS jersey_number
  UNION ALL
  SELECT 'KSA' AS short_code, 'Ahmed Al-Kassar' AS name, 'GK' AS position, 22 AS jersey_number
  UNION ALL
  SELECT 'KSA' AS short_code, 'Mohamed Kanno' AS name, 'MID' AS position, 23 AS jersey_number
  UNION ALL
  SELECT 'KSA' AS short_code, 'Moteb Al-Harbi' AS name, 'DEF' AS position, 24 AS jersey_number
  UNION ALL
  SELECT 'KSA' AS short_code, 'Jehad Thakri' AS name, 'DEF' AS position, 25 AS jersey_number
  UNION ALL
  SELECT 'KSA' AS short_code, 'Mohammed Abu Al-Shamat' AS name, 'DEF' AS position, 26 AS jersey_number
  UNION ALL
  SELECT 'ESP' AS short_code, 'David Raya' AS name, 'GK' AS position, 1 AS jersey_number
  UNION ALL
  SELECT 'ESP' AS short_code, 'Marc Pubill' AS name, 'DEF' AS position, 2 AS jersey_number
  UNION ALL
  SELECT 'ESP' AS short_code, 'Álex Grimaldo' AS name, 'DEF' AS position, 3 AS jersey_number
  UNION ALL
  SELECT 'ESP' AS short_code, 'Eric García' AS name, 'DEF' AS position, 4 AS jersey_number
  UNION ALL
  SELECT 'ESP' AS short_code, 'Marcos Llorente' AS name, 'DEF' AS position, 5 AS jersey_number
  UNION ALL
  SELECT 'ESP' AS short_code, 'Mikel Merino' AS name, 'MID' AS position, 6 AS jersey_number
  UNION ALL
  SELECT 'ESP' AS short_code, 'Ferran Torres' AS name, 'FWD' AS position, 7 AS jersey_number
  UNION ALL
  SELECT 'ESP' AS short_code, 'Fabián Ruiz' AS name, 'MID' AS position, 8 AS jersey_number
  UNION ALL
  SELECT 'ESP' AS short_code, 'Gavi' AS name, 'MID' AS position, 9 AS jersey_number
  UNION ALL
  SELECT 'ESP' AS short_code, 'Dani Olmo' AS name, 'FWD' AS position, 10 AS jersey_number
  UNION ALL
  SELECT 'ESP' AS short_code, 'Yéremy Pino' AS name, 'FWD' AS position, 11 AS jersey_number
  UNION ALL
  SELECT 'ESP' AS short_code, 'Pedro Porro' AS name, 'DEF' AS position, 12 AS jersey_number
  UNION ALL
  SELECT 'ESP' AS short_code, 'Joan Garcia' AS name, 'GK' AS position, 13 AS jersey_number
  UNION ALL
  SELECT 'ESP' AS short_code, 'Aymeric Laporte' AS name, 'DEF' AS position, 14 AS jersey_number
  UNION ALL
  SELECT 'ESP' AS short_code, 'Álex Baena' AS name, 'MID' AS position, 15 AS jersey_number
  UNION ALL
  SELECT 'ESP' AS short_code, 'Rodri' AS name, 'MID' AS position, 16 AS jersey_number
  UNION ALL
  SELECT 'ESP' AS short_code, 'Nico Williams' AS name, 'FWD' AS position, 17 AS jersey_number
  UNION ALL
  SELECT 'ESP' AS short_code, 'Martín Zubimendi' AS name, 'MID' AS position, 18 AS jersey_number
  UNION ALL
  SELECT 'ESP' AS short_code, 'Lamine Yamal' AS name, 'FWD' AS position, 19 AS jersey_number
  UNION ALL
  SELECT 'ESP' AS short_code, 'Pedri' AS name, 'MID' AS position, 20 AS jersey_number
  UNION ALL
  SELECT 'ESP' AS short_code, 'Mikel Oyarzabal' AS name, 'FWD' AS position, 21 AS jersey_number
  UNION ALL
  SELECT 'ESP' AS short_code, 'Pau Cubarsí' AS name, 'DEF' AS position, 22 AS jersey_number
  UNION ALL
  SELECT 'ESP' AS short_code, 'Unai Simón' AS name, 'GK' AS position, 23 AS jersey_number
  UNION ALL
  SELECT 'ESP' AS short_code, 'Marc Cucurella' AS name, 'DEF' AS position, 24 AS jersey_number
  UNION ALL
  SELECT 'ESP' AS short_code, 'Víctor Muñoz' AS name, 'FWD' AS position, 25 AS jersey_number
  UNION ALL
  SELECT 'ESP' AS short_code, 'Borja Iglesias' AS name, 'FWD' AS position, 26 AS jersey_number
  UNION ALL
  SELECT 'URU' AS short_code, 'Sergio Rochet' AS name, 'GK' AS position, 1 AS jersey_number
  UNION ALL
  SELECT 'URU' AS short_code, 'José María Giménez' AS name, 'DEF' AS position, 2 AS jersey_number
  UNION ALL
  SELECT 'URU' AS short_code, 'Sebastián Cáceres' AS name, 'DEF' AS position, 3 AS jersey_number
  UNION ALL
  SELECT 'URU' AS short_code, 'Ronald Araújo' AS name, 'DEF' AS position, 4 AS jersey_number
  UNION ALL
  SELECT 'URU' AS short_code, 'Manuel Ugarte' AS name, 'MID' AS position, 5 AS jersey_number
  UNION ALL
  SELECT 'URU' AS short_code, 'Rodrigo Bentancur' AS name, 'MID' AS position, 6 AS jersey_number
  UNION ALL
  SELECT 'URU' AS short_code, 'Nicolás de la Cruz' AS name, 'MID' AS position, 7 AS jersey_number
  UNION ALL
  SELECT 'URU' AS short_code, 'Federico Valverde' AS name, 'MID' AS position, 8 AS jersey_number
  UNION ALL
  SELECT 'URU' AS short_code, 'Darwin Núñez' AS name, 'FWD' AS position, 9 AS jersey_number
  UNION ALL
  SELECT 'URU' AS short_code, 'Giorgian de Arrascaeta' AS name, 'MID' AS position, 10 AS jersey_number
  UNION ALL
  SELECT 'URU' AS short_code, 'Facundo Pellistri' AS name, 'FWD' AS position, 11 AS jersey_number
  UNION ALL
  SELECT 'URU' AS short_code, 'Santiago Mele' AS name, 'GK' AS position, 12 AS jersey_number
  UNION ALL
  SELECT 'URU' AS short_code, 'Guillermo Varela' AS name, 'DEF' AS position, 13 AS jersey_number
  UNION ALL
  SELECT 'URU' AS short_code, 'Agustín Canobbio' AS name, 'MID' AS position, 14 AS jersey_number
  UNION ALL
  SELECT 'URU' AS short_code, 'Emiliano Martínez' AS name, 'MID' AS position, 15 AS jersey_number
  UNION ALL
  SELECT 'URU' AS short_code, 'Mathías Olivera' AS name, 'DEF' AS position, 16 AS jersey_number
  UNION ALL
  SELECT 'URU' AS short_code, 'Matías Viña' AS name, 'DEF' AS position, 17 AS jersey_number
  UNION ALL
  SELECT 'URU' AS short_code, 'Brian Rodríguez' AS name, 'FWD' AS position, 18 AS jersey_number
  UNION ALL
  SELECT 'URU' AS short_code, 'Rodrigo Aguirre' AS name, 'FWD' AS position, 19 AS jersey_number
  UNION ALL
  SELECT 'URU' AS short_code, 'Maximiliano Araújo' AS name, 'MID' AS position, 20 AS jersey_number
  UNION ALL
  SELECT 'URU' AS short_code, 'Federico Viñas' AS name, 'FWD' AS position, 21 AS jersey_number
  UNION ALL
  SELECT 'URU' AS short_code, 'Joaquín Piquerez' AS name, 'MID' AS position, 22 AS jersey_number
  UNION ALL
  SELECT 'URU' AS short_code, 'Fernando Muslera' AS name, 'GK' AS position, 23 AS jersey_number
  UNION ALL
  SELECT 'URU' AS short_code, 'Santiago Bueno' AS name, 'DEF' AS position, 24 AS jersey_number
  UNION ALL
  SELECT 'URU' AS short_code, 'Juan Manuel Sanabria' AS name, 'MID' AS position, 25 AS jersey_number
  UNION ALL
  SELECT 'URU' AS short_code, 'Rodrigo Zalazar' AS name, 'MID' AS position, 26 AS jersey_number
  UNION ALL
  SELECT 'FRA' AS short_code, 'Brice Samba' AS name, 'GK' AS position, 1 AS jersey_number
  UNION ALL
  SELECT 'FRA' AS short_code, 'Malo Gusto' AS name, 'DEF' AS position, 2 AS jersey_number
  UNION ALL
  SELECT 'FRA' AS short_code, 'Lucas Digne' AS name, 'DEF' AS position, 3 AS jersey_number
  UNION ALL
  SELECT 'FRA' AS short_code, 'Dayot Upamecano' AS name, 'DEF' AS position, 4 AS jersey_number
  UNION ALL
  SELECT 'FRA' AS short_code, 'Jules Koundé' AS name, 'DEF' AS position, 5 AS jersey_number
  UNION ALL
  SELECT 'FRA' AS short_code, 'Manu Koné' AS name, 'MID' AS position, 6 AS jersey_number
  UNION ALL
  SELECT 'FRA' AS short_code, 'Ousmane Dembélé' AS name, 'FWD' AS position, 7 AS jersey_number
  UNION ALL
  SELECT 'FRA' AS short_code, 'Aurélien Tchouaméni' AS name, 'MID' AS position, 8 AS jersey_number
  UNION ALL
  SELECT 'FRA' AS short_code, 'Marcus Thuram' AS name, 'FWD' AS position, 9 AS jersey_number
  UNION ALL
  SELECT 'FRA' AS short_code, 'Kylian Mbappé' AS name, 'FWD' AS position, 10 AS jersey_number
  UNION ALL
  SELECT 'FRA' AS short_code, 'Michael Olise' AS name, 'FWD' AS position, 11 AS jersey_number
  UNION ALL
  SELECT 'FRA' AS short_code, 'Bradley Barcola' AS name, 'FWD' AS position, 12 AS jersey_number
  UNION ALL
  SELECT 'FRA' AS short_code, 'N''Golo Kanté' AS name, 'MID' AS position, 13 AS jersey_number
  UNION ALL
  SELECT 'FRA' AS short_code, 'Adrien Rabiot' AS name, 'MID' AS position, 14 AS jersey_number
  UNION ALL
  SELECT 'FRA' AS short_code, 'Ibrahima Konaté' AS name, 'DEF' AS position, 15 AS jersey_number
  UNION ALL
  SELECT 'FRA' AS short_code, 'Mike Maignan' AS name, 'GK' AS position, 16 AS jersey_number
  UNION ALL
  SELECT 'FRA' AS short_code, 'William Saliba' AS name, 'DEF' AS position, 17 AS jersey_number
  UNION ALL
  SELECT 'FRA' AS short_code, 'Warren Zaïre-Emery' AS name, 'MID' AS position, 18 AS jersey_number
  UNION ALL
  SELECT 'FRA' AS short_code, 'Théo Hernandez' AS name, 'DEF' AS position, 19 AS jersey_number
  UNION ALL
  SELECT 'FRA' AS short_code, 'Désiré Doué' AS name, 'FWD' AS position, 20 AS jersey_number
  UNION ALL
  SELECT 'FRA' AS short_code, 'Lucas Hernandez' AS name, 'DEF' AS position, 21 AS jersey_number
  UNION ALL
  SELECT 'FRA' AS short_code, 'Jean-Philippe Mateta' AS name, 'FWD' AS position, 22 AS jersey_number
  UNION ALL
  SELECT 'FRA' AS short_code, 'Robin Risser' AS name, 'GK' AS position, 23 AS jersey_number
  UNION ALL
  SELECT 'FRA' AS short_code, 'Rayan Cherki' AS name, 'MID' AS position, 24 AS jersey_number
  UNION ALL
  SELECT 'FRA' AS short_code, 'Maghnes Akliouche' AS name, 'MID' AS position, 25 AS jersey_number
  UNION ALL
  SELECT 'FRA' AS short_code, 'Maxence Lacroix' AS name, 'DEF' AS position, 26 AS jersey_number
  UNION ALL
  SELECT 'IRQ' AS short_code, 'Fahad Talib' AS name, 'GK' AS position, 1 AS jersey_number
  UNION ALL
  SELECT 'IRQ' AS short_code, 'Rebin Sulaka' AS name, 'DEF' AS position, 2 AS jersey_number
  UNION ALL
  SELECT 'IRQ' AS short_code, 'Hussein Ali' AS name, 'DEF' AS position, 3 AS jersey_number
  UNION ALL
  SELECT 'IRQ' AS short_code, 'Zaid Tahseen' AS name, 'DEF' AS position, 4 AS jersey_number
  UNION ALL
  SELECT 'IRQ' AS short_code, 'Akam Hashim' AS name, 'DEF' AS position, 5 AS jersey_number
  UNION ALL
  SELECT 'IRQ' AS short_code, 'Manaf Younis' AS name, 'DEF' AS position, 6 AS jersey_number
  UNION ALL
  SELECT 'IRQ' AS short_code, 'Youssef Amyn' AS name, 'MID' AS position, 7 AS jersey_number
  UNION ALL
  SELECT 'IRQ' AS short_code, 'Ibrahim Bayesh' AS name, 'MID' AS position, 8 AS jersey_number
  UNION ALL
  SELECT 'IRQ' AS short_code, 'Ali Al-Hamadi' AS name, 'FWD' AS position, 9 AS jersey_number
  UNION ALL
  SELECT 'IRQ' AS short_code, 'Mohanad Ali' AS name, 'FWD' AS position, 10 AS jersey_number
  UNION ALL
  SELECT 'IRQ' AS short_code, 'Ahmed Qasem' AS name, 'FWD' AS position, 11 AS jersey_number
  UNION ALL
  SELECT 'IRQ' AS short_code, 'Jalal Hassan' AS name, 'GK' AS position, 12 AS jersey_number
  UNION ALL
  SELECT 'IRQ' AS short_code, 'Ali Yousif' AS name, 'FWD' AS position, 13 AS jersey_number
  UNION ALL
  SELECT 'IRQ' AS short_code, 'Zidane Iqbal' AS name, 'MID' AS position, 14 AS jersey_number
  UNION ALL
  SELECT 'IRQ' AS short_code, 'Ahmed Maknzi' AS name, 'DEF' AS position, 15 AS jersey_number
  UNION ALL
  SELECT 'IRQ' AS short_code, 'Amir Al-Ammari' AS name, 'MID' AS position, 16 AS jersey_number
  UNION ALL
  SELECT 'IRQ' AS short_code, 'Ali Jasim' AS name, 'FWD' AS position, 17 AS jersey_number
  UNION ALL
  SELECT 'IRQ' AS short_code, 'Aymen Hussein' AS name, 'FWD' AS position, 18 AS jersey_number
  UNION ALL
  SELECT 'IRQ' AS short_code, 'Kevin Yakob' AS name, 'MID' AS position, 19 AS jersey_number
  UNION ALL
  SELECT 'IRQ' AS short_code, 'Aimar Sher' AS name, 'MID' AS position, 20 AS jersey_number
  UNION ALL
  SELECT 'IRQ' AS short_code, 'Marko Farji' AS name, 'FWD' AS position, 21 AS jersey_number
  UNION ALL
  SELECT 'IRQ' AS short_code, 'Ahmed Basil' AS name, 'GK' AS position, 22 AS jersey_number
  UNION ALL
  SELECT 'IRQ' AS short_code, 'Merchas Doski' AS name, 'DEF' AS position, 23 AS jersey_number
  UNION ALL
  SELECT 'IRQ' AS short_code, 'Zaid Ismail' AS name, 'MID' AS position, 24 AS jersey_number
  UNION ALL
  SELECT 'IRQ' AS short_code, 'Mustafa Saadoon' AS name, 'DEF' AS position, 25 AS jersey_number
  UNION ALL
  SELECT 'IRQ' AS short_code, 'Frans Putros' AS name, 'DEF' AS position, 26 AS jersey_number
  UNION ALL
  SELECT 'NOR' AS short_code, 'Ørjan Nyland' AS name, 'GK' AS position, 1 AS jersey_number
  UNION ALL
  SELECT 'NOR' AS short_code, 'Morten Thorsby' AS name, 'MID' AS position, 2 AS jersey_number
  UNION ALL
  SELECT 'NOR' AS short_code, 'Kristoffer Ajer' AS name, 'DEF' AS position, 3 AS jersey_number
  UNION ALL
  SELECT 'NOR' AS short_code, 'Leo Østigård' AS name, 'DEF' AS position, 4 AS jersey_number
  UNION ALL
  SELECT 'NOR' AS short_code, 'David Møller Wolfe' AS name, 'DEF' AS position, 5 AS jersey_number
  UNION ALL
  SELECT 'NOR' AS short_code, 'Patrick Berg' AS name, 'MID' AS position, 6 AS jersey_number
  UNION ALL
  SELECT 'NOR' AS short_code, 'Alexander Sørloth' AS name, 'FWD' AS position, 7 AS jersey_number
  UNION ALL
  SELECT 'NOR' AS short_code, 'Sander Berge' AS name, 'MID' AS position, 8 AS jersey_number
  UNION ALL
  SELECT 'NOR' AS short_code, 'Erling Haaland' AS name, 'FWD' AS position, 9 AS jersey_number
  UNION ALL
  SELECT 'NOR' AS short_code, 'Martin Ødegaard' AS name, 'MID' AS position, 10 AS jersey_number
  UNION ALL
  SELECT 'NOR' AS short_code, 'Jørgen Strand Larsen' AS name, 'FWD' AS position, 11 AS jersey_number
  UNION ALL
  SELECT 'NOR' AS short_code, 'Sander Tangvik' AS name, 'GK' AS position, 12 AS jersey_number
  UNION ALL
  SELECT 'NOR' AS short_code, 'Egil Selvik' AS name, 'GK' AS position, 13 AS jersey_number
  UNION ALL
  SELECT 'NOR' AS short_code, 'Fredrik Aursnes' AS name, 'MID' AS position, 14 AS jersey_number
  UNION ALL
  SELECT 'NOR' AS short_code, 'Fredrik André Bjørkan' AS name, 'DEF' AS position, 15 AS jersey_number
  UNION ALL
  SELECT 'NOR' AS short_code, 'Marcus Holmgren Pedersen' AS name, 'DEF' AS position, 16 AS jersey_number
  UNION ALL
  SELECT 'NOR' AS short_code, 'Torbjørn Heggem' AS name, 'DEF' AS position, 17 AS jersey_number
  UNION ALL
  SELECT 'NOR' AS short_code, 'Kristian Thorstvedt' AS name, 'MID' AS position, 18 AS jersey_number
  UNION ALL
  SELECT 'NOR' AS short_code, 'Thelo Aasgaard' AS name, 'MID' AS position, 19 AS jersey_number
  UNION ALL
  SELECT 'NOR' AS short_code, 'Antonio Nusa' AS name, 'FWD' AS position, 20 AS jersey_number
  UNION ALL
  SELECT 'NOR' AS short_code, 'Andreas Schjelderup' AS name, 'MID' AS position, 21 AS jersey_number
  UNION ALL
  SELECT 'NOR' AS short_code, 'Oscar Bobb' AS name, 'MID' AS position, 22 AS jersey_number
  UNION ALL
  SELECT 'NOR' AS short_code, 'Jens Petter Hauge' AS name, 'MID' AS position, 23 AS jersey_number
  UNION ALL
  SELECT 'NOR' AS short_code, 'Sondre Langås' AS name, 'DEF' AS position, 24 AS jersey_number
  UNION ALL
  SELECT 'NOR' AS short_code, 'Henrik Falchener' AS name, 'DEF' AS position, 25 AS jersey_number
  UNION ALL
  SELECT 'NOR' AS short_code, 'Julian Ryerson' AS name, 'FWD' AS position, 26 AS jersey_number
  UNION ALL
  SELECT 'SEN' AS short_code, 'Yehvann Diouf' AS name, 'GK' AS position, 1 AS jersey_number
  UNION ALL
  SELECT 'SEN' AS short_code, 'Mamadou Sarr' AS name, 'DEF' AS position, 2 AS jersey_number
  UNION ALL
  SELECT 'SEN' AS short_code, 'Kalidou Koulibaly' AS name, 'DEF' AS position, 3 AS jersey_number
  UNION ALL
  SELECT 'SEN' AS short_code, 'Abdoulaye Seck' AS name, 'DEF' AS position, 4 AS jersey_number
  UNION ALL
  SELECT 'SEN' AS short_code, 'Idrissa Gueye' AS name, 'MID' AS position, 5 AS jersey_number
  UNION ALL
  SELECT 'SEN' AS short_code, 'Pathé Ciss' AS name, 'MID' AS position, 6 AS jersey_number
  UNION ALL
  SELECT 'SEN' AS short_code, 'Assane Diao' AS name, 'FWD' AS position, 7 AS jersey_number
  UNION ALL
  SELECT 'SEN' AS short_code, 'Lamine Camara' AS name, 'MID' AS position, 8 AS jersey_number
  UNION ALL
  SELECT 'SEN' AS short_code, 'Bamba Dieng' AS name, 'FWD' AS position, 9 AS jersey_number
  UNION ALL
  SELECT 'SEN' AS short_code, 'Sadio Mané' AS name, 'FWD' AS position, 10 AS jersey_number
  UNION ALL
  SELECT 'SEN' AS short_code, 'Nicolas Jackson' AS name, 'FWD' AS position, 11 AS jersey_number
  UNION ALL
  SELECT 'SEN' AS short_code, 'Cherif Ndiaye' AS name, 'FWD' AS position, 12 AS jersey_number
  UNION ALL
  SELECT 'SEN' AS short_code, 'Iliman Ndiaye' AS name, 'FWD' AS position, 13 AS jersey_number
  UNION ALL
  SELECT 'SEN' AS short_code, 'Ismail Jakobs' AS name, 'DEF' AS position, 14 AS jersey_number
  UNION ALL
  SELECT 'SEN' AS short_code, 'Krépin Diatta' AS name, 'DEF' AS position, 15 AS jersey_number
  UNION ALL
  SELECT 'SEN' AS short_code, 'Édouard Mendy' AS name, 'GK' AS position, 16 AS jersey_number
  UNION ALL
  SELECT 'SEN' AS short_code, 'Pape Matar Sarr' AS name, 'MID' AS position, 17 AS jersey_number
  UNION ALL
  SELECT 'SEN' AS short_code, 'Ismaïla Sarr' AS name, 'FWD' AS position, 18 AS jersey_number
  UNION ALL
  SELECT 'SEN' AS short_code, 'Moussa Niakhaté' AS name, 'DEF' AS position, 19 AS jersey_number
  UNION ALL
  SELECT 'SEN' AS short_code, 'Ibrahim Mbaye' AS name, 'FWD' AS position, 20 AS jersey_number
  UNION ALL
  SELECT 'SEN' AS short_code, 'Habib Diarra' AS name, 'MID' AS position, 21 AS jersey_number
  UNION ALL
  SELECT 'SEN' AS short_code, 'Bara Sapoko Ndiaye' AS name, 'MID' AS position, 22 AS jersey_number
  UNION ALL
  SELECT 'SEN' AS short_code, 'Mory Diaw' AS name, 'GK' AS position, 23 AS jersey_number
  UNION ALL
  SELECT 'SEN' AS short_code, 'Antoine Mendy' AS name, 'DEF' AS position, 24 AS jersey_number
  UNION ALL
  SELECT 'SEN' AS short_code, 'El Hadji Malick Diouf' AS name, 'DEF' AS position, 25 AS jersey_number
  UNION ALL
  SELECT 'SEN' AS short_code, 'Pape Gueye' AS name, 'MID' AS position, 26 AS jersey_number
  UNION ALL
  SELECT 'ALG' AS short_code, 'Melvin Mastil' AS name, 'GK' AS position, 1 AS jersey_number
  UNION ALL
  SELECT 'ALG' AS short_code, 'Aïssa Mandi' AS name, 'DEF' AS position, 2 AS jersey_number
  UNION ALL
  SELECT 'ALG' AS short_code, 'Achref Abada' AS name, 'DEF' AS position, 3 AS jersey_number
  UNION ALL
  SELECT 'ALG' AS short_code, 'Mohamed Amine Tougai' AS name, 'DEF' AS position, 4 AS jersey_number
  UNION ALL
  SELECT 'ALG' AS short_code, 'Zineddine Belaïd' AS name, 'DEF' AS position, 5 AS jersey_number
  UNION ALL
  SELECT 'ALG' AS short_code, 'Ramiz Zerrouki' AS name, 'MID' AS position, 6 AS jersey_number
  UNION ALL
  SELECT 'ALG' AS short_code, 'Riyad Mahrez' AS name, 'FWD' AS position, 7 AS jersey_number
  UNION ALL
  SELECT 'ALG' AS short_code, 'Houssem Aouar' AS name, 'MID' AS position, 8 AS jersey_number
  UNION ALL
  SELECT 'ALG' AS short_code, 'Amine Gouiri' AS name, 'FWD' AS position, 9 AS jersey_number
  UNION ALL
  SELECT 'ALG' AS short_code, 'Farès Chaïbi' AS name, 'MID' AS position, 10 AS jersey_number
  UNION ALL
  SELECT 'ALG' AS short_code, 'Anis Hadj Moussa' AS name, 'FWD' AS position, 11 AS jersey_number
  UNION ALL
  SELECT 'ALG' AS short_code, 'Nadhir Benbouali' AS name, 'FWD' AS position, 12 AS jersey_number
  UNION ALL
  SELECT 'ALG' AS short_code, 'Jaouen Hadjam' AS name, 'DEF' AS position, 13 AS jersey_number
  UNION ALL
  SELECT 'ALG' AS short_code, 'Hicham Boudaoui' AS name, 'MID' AS position, 14 AS jersey_number
  UNION ALL
  SELECT 'ALG' AS short_code, 'Rayan Aït-Nouri' AS name, 'DEF' AS position, 15 AS jersey_number
  UNION ALL
  SELECT 'ALG' AS short_code, 'Oussama Benbot' AS name, 'GK' AS position, 16 AS jersey_number
  UNION ALL
  SELECT 'ALG' AS short_code, 'Rafik Belghali' AS name, 'DEF' AS position, 17 AS jersey_number
  UNION ALL
  SELECT 'ALG' AS short_code, 'Mohamed Amoura' AS name, 'FWD' AS position, 18 AS jersey_number
  UNION ALL
  SELECT 'ALG' AS short_code, 'Nabil Bentaleb' AS name, 'MID' AS position, 19 AS jersey_number
  UNION ALL
  SELECT 'ALG' AS short_code, 'Adil Boulbina' AS name, 'FWD' AS position, 20 AS jersey_number
  UNION ALL
  SELECT 'ALG' AS short_code, 'Ramy Bensebaini' AS name, 'DEF' AS position, 21 AS jersey_number
  UNION ALL
  SELECT 'ALG' AS short_code, 'Ibrahim Maza' AS name, 'MID' AS position, 22 AS jersey_number
  UNION ALL
  SELECT 'ALG' AS short_code, 'Luca Zidane' AS name, 'GK' AS position, 23 AS jersey_number
  UNION ALL
  SELECT 'ALG' AS short_code, 'Yacine Titraoui' AS name, 'MID' AS position, 24 AS jersey_number
  UNION ALL
  SELECT 'ALG' AS short_code, 'Farès Ghedjemis' AS name, 'FWD' AS position, 25 AS jersey_number
  UNION ALL
  SELECT 'ALG' AS short_code, 'Samir Chergui' AS name, 'DEF' AS position, 26 AS jersey_number
  UNION ALL
  SELECT 'ARG' AS short_code, 'Juan Musso' AS name, 'GK' AS position, 1 AS jersey_number
  UNION ALL
  SELECT 'ARG' AS short_code, 'Marcos Senesi' AS name, 'DEF' AS position, 2 AS jersey_number
  UNION ALL
  SELECT 'ARG' AS short_code, 'Nicolás Tagliafico' AS name, 'DEF' AS position, 3 AS jersey_number
  UNION ALL
  SELECT 'ARG' AS short_code, 'Gonzalo Montiel' AS name, 'DEF' AS position, 4 AS jersey_number
  UNION ALL
  SELECT 'ARG' AS short_code, 'Leandro Paredes' AS name, 'MID' AS position, 5 AS jersey_number
  UNION ALL
  SELECT 'ARG' AS short_code, 'Lisandro Martínez' AS name, 'DEF' AS position, 6 AS jersey_number
  UNION ALL
  SELECT 'ARG' AS short_code, 'Rodrigo De Paul' AS name, 'MID' AS position, 7 AS jersey_number
  UNION ALL
  SELECT 'ARG' AS short_code, 'Valentín Barco' AS name, 'MID' AS position, 8 AS jersey_number
  UNION ALL
  SELECT 'ARG' AS short_code, 'Julián Alvarez' AS name, 'FWD' AS position, 9 AS jersey_number
  UNION ALL
  SELECT 'ARG' AS short_code, 'Lionel Messi' AS name, 'FWD' AS position, 10 AS jersey_number
  UNION ALL
  SELECT 'ARG' AS short_code, 'Giovani Lo Celso' AS name, 'MID' AS position, 11 AS jersey_number
  UNION ALL
  SELECT 'ARG' AS short_code, 'Gerónimo Rulli' AS name, 'GK' AS position, 12 AS jersey_number
  UNION ALL
  SELECT 'ARG' AS short_code, 'Cristian Romero' AS name, 'DEF' AS position, 13 AS jersey_number
  UNION ALL
  SELECT 'ARG' AS short_code, 'Exequiel Palacios' AS name, 'MID' AS position, 14 AS jersey_number
  UNION ALL
  SELECT 'ARG' AS short_code, 'Nicolás González' AS name, 'MID' AS position, 15 AS jersey_number
  UNION ALL
  SELECT 'ARG' AS short_code, 'Thiago Almada' AS name, 'FWD' AS position, 16 AS jersey_number
  UNION ALL
  SELECT 'ARG' AS short_code, 'Giuliano Simeone' AS name, 'FWD' AS position, 17 AS jersey_number
  UNION ALL
  SELECT 'ARG' AS short_code, 'Nico Paz' AS name, 'FWD' AS position, 18 AS jersey_number
  UNION ALL
  SELECT 'ARG' AS short_code, 'Nicolás Otamendi' AS name, 'DEF' AS position, 19 AS jersey_number
  UNION ALL
  SELECT 'ARG' AS short_code, 'Alexis Mac Allister' AS name, 'MID' AS position, 20 AS jersey_number
  UNION ALL
  SELECT 'ARG' AS short_code, 'José Manuel López' AS name, 'FWD' AS position, 21 AS jersey_number
  UNION ALL
  SELECT 'ARG' AS short_code, 'Lautaro Martínez' AS name, 'FWD' AS position, 22 AS jersey_number
  UNION ALL
  SELECT 'ARG' AS short_code, 'Emiliano Martínez' AS name, 'GK' AS position, 23 AS jersey_number
  UNION ALL
  SELECT 'ARG' AS short_code, 'Enzo Fernández' AS name, 'MID' AS position, 24 AS jersey_number
  UNION ALL
  SELECT 'ARG' AS short_code, 'Facundo Medina' AS name, 'DEF' AS position, 25 AS jersey_number
  UNION ALL
  SELECT 'ARG' AS short_code, 'Nahuel Molina' AS name, 'DEF' AS position, 26 AS jersey_number
  UNION ALL
  SELECT 'AUT' AS short_code, 'Alexander Schlager' AS name, 'GK' AS position, 1 AS jersey_number
  UNION ALL
  SELECT 'AUT' AS short_code, 'David Affengruber' AS name, 'DEF' AS position, 2 AS jersey_number
  UNION ALL
  SELECT 'AUT' AS short_code, 'Kevin Danso' AS name, 'DEF' AS position, 3 AS jersey_number
  UNION ALL
  SELECT 'AUT' AS short_code, 'Xaver Schlager' AS name, 'MID' AS position, 4 AS jersey_number
  UNION ALL
  SELECT 'AUT' AS short_code, 'Stefan Posch' AS name, 'DEF' AS position, 5 AS jersey_number
  UNION ALL
  SELECT 'AUT' AS short_code, 'Nicolas Seiwald' AS name, 'MID' AS position, 6 AS jersey_number
  UNION ALL
  SELECT 'AUT' AS short_code, 'Marko Arnautović' AS name, 'FWD' AS position, 7 AS jersey_number
  UNION ALL
  SELECT 'AUT' AS short_code, 'David Alaba' AS name, 'DEF' AS position, 8 AS jersey_number
  UNION ALL
  SELECT 'AUT' AS short_code, 'Marcel Sabitzer' AS name, 'MID' AS position, 9 AS jersey_number
  UNION ALL
  SELECT 'AUT' AS short_code, 'Florian Grillitsch' AS name, 'MID' AS position, 10 AS jersey_number
  UNION ALL
  SELECT 'AUT' AS short_code, 'Michael Gregoritsch' AS name, 'FWD' AS position, 11 AS jersey_number
  UNION ALL
  SELECT 'AUT' AS short_code, 'Florian Wiegele' AS name, 'GK' AS position, 12 AS jersey_number
  UNION ALL
  SELECT 'AUT' AS short_code, 'Patrick Pentz' AS name, 'GK' AS position, 13 AS jersey_number
  UNION ALL
  SELECT 'AUT' AS short_code, 'Saša Kalajdžić' AS name, 'FWD' AS position, 14 AS jersey_number
  UNION ALL
  SELECT 'AUT' AS short_code, 'Philipp Lienhart' AS name, 'DEF' AS position, 15 AS jersey_number
  UNION ALL
  SELECT 'AUT' AS short_code, 'Phillipp Mwene' AS name, 'DEF' AS position, 16 AS jersey_number
  UNION ALL
  SELECT 'AUT' AS short_code, 'Carney Chukwuemeka' AS name, 'MID' AS position, 17 AS jersey_number
  UNION ALL
  SELECT 'AUT' AS short_code, 'Romano Schmid' AS name, 'MID' AS position, 18 AS jersey_number
  UNION ALL
  SELECT 'AUT' AS short_code, 'Dejan Ljubičić' AS name, 'MID' AS position, 19 AS jersey_number
  UNION ALL
  SELECT 'AUT' AS short_code, 'Konrad Laimer' AS name, 'MID' AS position, 20 AS jersey_number
  UNION ALL
  SELECT 'AUT' AS short_code, 'Patrick Wimmer' AS name, 'FWD' AS position, 21 AS jersey_number
  UNION ALL
  SELECT 'AUT' AS short_code, 'Alexander Prass' AS name, 'MID' AS position, 22 AS jersey_number
  UNION ALL
  SELECT 'AUT' AS short_code, 'Marco Friedl' AS name, 'DEF' AS position, 23 AS jersey_number
  UNION ALL
  SELECT 'AUT' AS short_code, 'Paul Wanner' AS name, 'MID' AS position, 24 AS jersey_number
  UNION ALL
  SELECT 'AUT' AS short_code, 'Michael Svoboda' AS name, 'DEF' AS position, 25 AS jersey_number
  UNION ALL
  SELECT 'AUT' AS short_code, 'Alessandro Schöpf' AS name, 'MID' AS position, 26 AS jersey_number
  UNION ALL
  SELECT 'JOR' AS short_code, 'Yazeed Abulaila' AS name, 'GK' AS position, 1 AS jersey_number
  UNION ALL
  SELECT 'JOR' AS short_code, 'Mohammad Abu Hashish' AS name, 'DEF' AS position, 2 AS jersey_number
  UNION ALL
  SELECT 'JOR' AS short_code, 'Abdallah Nasib' AS name, 'DEF' AS position, 3 AS jersey_number
  UNION ALL
  SELECT 'JOR' AS short_code, 'Husam Abu Dahab' AS name, 'DEF' AS position, 4 AS jersey_number
  UNION ALL
  SELECT 'JOR' AS short_code, 'Yazan Al-Arab' AS name, 'DEF' AS position, 5 AS jersey_number
  UNION ALL
  SELECT 'JOR' AS short_code, 'Amer Jamous' AS name, 'MID' AS position, 6 AS jersey_number
  UNION ALL
  SELECT 'JOR' AS short_code, 'Mohammad Abu Zrayq' AS name, 'FWD' AS position, 7 AS jersey_number
  UNION ALL
  SELECT 'JOR' AS short_code, 'Noor Al-Rawabdeh' AS name, 'MID' AS position, 8 AS jersey_number
  UNION ALL
  SELECT 'JOR' AS short_code, 'Ali Olwan' AS name, 'FWD' AS position, 9 AS jersey_number
  UNION ALL
  SELECT 'JOR' AS short_code, 'Musa Al-Taamari' AS name, 'FWD' AS position, 10 AS jersey_number
  UNION ALL
  SELECT 'JOR' AS short_code, 'Odeh Al-Fakhouri' AS name, 'FWD' AS position, 11 AS jersey_number
  UNION ALL
  SELECT 'JOR' AS short_code, 'Nour Bani Attiah' AS name, 'GK' AS position, 12 AS jersey_number
  UNION ALL
  SELECT 'JOR' AS short_code, 'Mahmoud Al-Mardi' AS name, 'FWD' AS position, 13 AS jersey_number
  UNION ALL
  SELECT 'JOR' AS short_code, 'Rajaei Ayed' AS name, 'MID' AS position, 14 AS jersey_number
  UNION ALL
  SELECT 'JOR' AS short_code, 'Ibrahim Sadeh' AS name, 'MID' AS position, 15 AS jersey_number
  UNION ALL
  SELECT 'JOR' AS short_code, 'Mo Abualnadi' AS name, 'DEF' AS position, 16 AS jersey_number
  UNION ALL
  SELECT 'JOR' AS short_code, 'Salim Obaid' AS name, 'DEF' AS position, 17 AS jersey_number
  UNION ALL
  SELECT 'JOR' AS short_code, 'Mohammad Taha' AS name, 'MID' AS position, 18 AS jersey_number
  UNION ALL
  SELECT 'JOR' AS short_code, 'Saed Al-Rosan' AS name, 'DEF' AS position, 19 AS jersey_number
  UNION ALL
  SELECT 'JOR' AS short_code, 'Mohannad Abu Taha' AS name, 'MID' AS position, 20 AS jersey_number
  UNION ALL
  SELECT 'JOR' AS short_code, 'Nizar Al-Rashdan' AS name, 'MID' AS position, 21 AS jersey_number
  UNION ALL
  SELECT 'JOR' AS short_code, 'Abdallah Al-Fakhouri' AS name, 'GK' AS position, 22 AS jersey_number
  UNION ALL
  SELECT 'JOR' AS short_code, 'Ihsan Haddad' AS name, 'DEF' AS position, 23 AS jersey_number
  UNION ALL
  SELECT 'JOR' AS short_code, 'Ali Azaizeh' AS name, 'FWD' AS position, 24 AS jersey_number
  UNION ALL
  SELECT 'JOR' AS short_code, 'Mohammad Al-Dawoud' AS name, 'MID' AS position, 25 AS jersey_number
  UNION ALL
  SELECT 'JOR' AS short_code, 'Anas Badawi' AS name, 'DEF' AS position, 26 AS jersey_number
  UNION ALL
  SELECT 'COL' AS short_code, 'David Ospina' AS name, 'GK' AS position, 1 AS jersey_number
  UNION ALL
  SELECT 'COL' AS short_code, 'Daniel Muñoz' AS name, 'DEF' AS position, 2 AS jersey_number
  UNION ALL
  SELECT 'COL' AS short_code, 'Jhon Lucumí' AS name, 'DEF' AS position, 3 AS jersey_number
  UNION ALL
  SELECT 'COL' AS short_code, 'Santiago Arias' AS name, 'DEF' AS position, 4 AS jersey_number
  UNION ALL
  SELECT 'COL' AS short_code, 'Kevin Castaño' AS name, 'MID' AS position, 5 AS jersey_number
  UNION ALL
  SELECT 'COL' AS short_code, 'Richard Ríos' AS name, 'MID' AS position, 6 AS jersey_number
  UNION ALL
  SELECT 'COL' AS short_code, 'Luis Díaz' AS name, 'FWD' AS position, 7 AS jersey_number
  UNION ALL
  SELECT 'COL' AS short_code, 'Jorge Carrascal' AS name, 'MID' AS position, 8 AS jersey_number
  UNION ALL
  SELECT 'COL' AS short_code, 'Jhon Córdoba' AS name, 'FWD' AS position, 9 AS jersey_number
  UNION ALL
  SELECT 'COL' AS short_code, 'James Rodríguez' AS name, 'MID' AS position, 10 AS jersey_number
  UNION ALL
  SELECT 'COL' AS short_code, 'Jhon Arias' AS name, 'MID' AS position, 11 AS jersey_number
  UNION ALL
  SELECT 'COL' AS short_code, 'Camilo Vargas' AS name, 'GK' AS position, 12 AS jersey_number
  UNION ALL
  SELECT 'COL' AS short_code, 'Yerry Mina' AS name, 'DEF' AS position, 13 AS jersey_number
  UNION ALL
  SELECT 'COL' AS short_code, 'Gustavo Puerta' AS name, 'DEF' AS position, 14 AS jersey_number
  UNION ALL
  SELECT 'COL' AS short_code, 'Juan Portilla' AS name, 'MID' AS position, 15 AS jersey_number
  UNION ALL
  SELECT 'COL' AS short_code, 'Jefferson Lerma' AS name, 'MID' AS position, 16 AS jersey_number
  UNION ALL
  SELECT 'COL' AS short_code, 'Johan Mojica' AS name, 'DEF' AS position, 17 AS jersey_number
  UNION ALL
  SELECT 'COL' AS short_code, 'Willer Ditta' AS name, 'DEF' AS position, 18 AS jersey_number
  UNION ALL
  SELECT 'COL' AS short_code, 'Cucho Hernández' AS name, 'FWD' AS position, 19 AS jersey_number
  UNION ALL
  SELECT 'COL' AS short_code, 'Juan Fernando Quintero' AS name, 'MID' AS position, 20 AS jersey_number
  UNION ALL
  SELECT 'COL' AS short_code, 'Jaminton Campaz' AS name, 'FWD' AS position, 21 AS jersey_number
  UNION ALL
  SELECT 'COL' AS short_code, 'Deiver Machado' AS name, 'DEF' AS position, 22 AS jersey_number
  UNION ALL
  SELECT 'COL' AS short_code, 'Davinson Sánchez' AS name, 'DEF' AS position, 23 AS jersey_number
  UNION ALL
  SELECT 'COL' AS short_code, 'Álvaro Montero' AS name, 'GK' AS position, 24 AS jersey_number
  UNION ALL
  SELECT 'COL' AS short_code, 'Luis Suárez' AS name, 'FWD' AS position, 25 AS jersey_number
  UNION ALL
  SELECT 'COL' AS short_code, 'Andrés Gómez' AS name, 'FWD' AS position, 26 AS jersey_number
  UNION ALL
  SELECT 'COD' AS short_code, 'Lionel Mpasi' AS name, 'GK' AS position, 1 AS jersey_number
  UNION ALL
  SELECT 'COD' AS short_code, 'Aaron Wan-Bissaka' AS name, 'DEF' AS position, 2 AS jersey_number
  UNION ALL
  SELECT 'COD' AS short_code, 'Steve Kapuadi' AS name, 'DEF' AS position, 3 AS jersey_number
  UNION ALL
  SELECT 'COD' AS short_code, 'Axel Tuanzebe' AS name, 'DEF' AS position, 4 AS jersey_number
  UNION ALL
  SELECT 'COD' AS short_code, 'Dylan Batubinsika' AS name, 'DEF' AS position, 5 AS jersey_number
  UNION ALL
  SELECT 'COD' AS short_code, 'Ngal''ayel Mukau' AS name, 'MID' AS position, 6 AS jersey_number
  UNION ALL
  SELECT 'COD' AS short_code, 'Nathanaël Mbuku' AS name, 'MID' AS position, 7 AS jersey_number
  UNION ALL
  SELECT 'COD' AS short_code, 'Samuel Moutoussamy' AS name, 'MID' AS position, 8 AS jersey_number
  UNION ALL
  SELECT 'COD' AS short_code, 'Brian Cipenga' AS name, 'FWD' AS position, 9 AS jersey_number
  UNION ALL
  SELECT 'COD' AS short_code, 'Théo Bongonda' AS name, 'MID' AS position, 10 AS jersey_number
  UNION ALL
  SELECT 'COD' AS short_code, 'Gaël Kakuta' AS name, 'FWD' AS position, 11 AS jersey_number
  UNION ALL
  SELECT 'COD' AS short_code, 'Joris Kayembe' AS name, 'DEF' AS position, 12 AS jersey_number
  UNION ALL
  SELECT 'COD' AS short_code, 'Meschak Elia' AS name, 'FWD' AS position, 13 AS jersey_number
  UNION ALL
  SELECT 'COD' AS short_code, 'Noah Sadiki' AS name, 'MID' AS position, 14 AS jersey_number
  UNION ALL
  SELECT 'COD' AS short_code, 'Aaron Tshibola' AS name, 'MID' AS position, 15 AS jersey_number
  UNION ALL
  SELECT 'COD' AS short_code, 'Timothy Fayulu' AS name, 'GK' AS position, 16 AS jersey_number
  UNION ALL
  SELECT 'COD' AS short_code, 'Cédric Bakambu' AS name, 'FWD' AS position, 17 AS jersey_number
  UNION ALL
  SELECT 'COD' AS short_code, 'Charles Pickel' AS name, 'MID' AS position, 18 AS jersey_number
  UNION ALL
  SELECT 'COD' AS short_code, 'Fiston Mayele' AS name, 'FWD' AS position, 19 AS jersey_number
  UNION ALL
  SELECT 'COD' AS short_code, 'Yoane Wissa' AS name, 'FWD' AS position, 20 AS jersey_number
  UNION ALL
  SELECT 'COD' AS short_code, 'Matthieu Epolo' AS name, 'GK' AS position, 21 AS jersey_number
  UNION ALL
  SELECT 'COD' AS short_code, 'Chancel Mbemba' AS name, 'DEF' AS position, 22 AS jersey_number
  UNION ALL
  SELECT 'COD' AS short_code, 'Simon Banza' AS name, 'FWD' AS position, 23 AS jersey_number
  UNION ALL
  SELECT 'COD' AS short_code, 'Gédéon Kalulu' AS name, 'DEF' AS position, 24 AS jersey_number
  UNION ALL
  SELECT 'COD' AS short_code, 'Edo Kayembe' AS name, 'MID' AS position, 25 AS jersey_number
  UNION ALL
  SELECT 'COD' AS short_code, 'Arthur Masuaku' AS name, 'DEF' AS position, 26 AS jersey_number
  UNION ALL
  SELECT 'POR' AS short_code, 'Diogo Costa' AS name, 'GK' AS position, 1 AS jersey_number
  UNION ALL
  SELECT 'POR' AS short_code, 'Nélson Semedo' AS name, 'DEF' AS position, 2 AS jersey_number
  UNION ALL
  SELECT 'POR' AS short_code, 'Rúben Dias' AS name, 'DEF' AS position, 3 AS jersey_number
  UNION ALL
  SELECT 'POR' AS short_code, 'Tomás Araújo' AS name, 'DEF' AS position, 4 AS jersey_number
  UNION ALL
  SELECT 'POR' AS short_code, 'Diogo Dalot' AS name, 'DEF' AS position, 5 AS jersey_number
  UNION ALL
  SELECT 'POR' AS short_code, 'Matheus Nunes' AS name, 'MID' AS position, 6 AS jersey_number
  UNION ALL
  SELECT 'POR' AS short_code, 'Cristiano Ronaldo' AS name, 'FWD' AS position, 7 AS jersey_number
  UNION ALL
  SELECT 'POR' AS short_code, 'Bruno Fernandes' AS name, 'MID' AS position, 8 AS jersey_number
  UNION ALL
  SELECT 'POR' AS short_code, 'Gonçalo Ramos' AS name, 'FWD' AS position, 9 AS jersey_number
  UNION ALL
  SELECT 'POR' AS short_code, 'Bernardo Silva' AS name, 'MID' AS position, 10 AS jersey_number
  UNION ALL
  SELECT 'POR' AS short_code, 'João Félix' AS name, 'FWD' AS position, 11 AS jersey_number
  UNION ALL
  SELECT 'POR' AS short_code, 'José Sá' AS name, 'GK' AS position, 12 AS jersey_number
  UNION ALL
  SELECT 'POR' AS short_code, 'Renato Veiga' AS name, 'DEF' AS position, 13 AS jersey_number
  UNION ALL
  SELECT 'POR' AS short_code, 'Gonçalo Inácio' AS name, 'DEF' AS position, 14 AS jersey_number
  UNION ALL
  SELECT 'POR' AS short_code, 'João Neves' AS name, 'MID' AS position, 15 AS jersey_number
  UNION ALL
  SELECT 'POR' AS short_code, 'Francisco Trincão' AS name, 'FWD' AS position, 16 AS jersey_number
  UNION ALL
  SELECT 'POR' AS short_code, 'Rafael Leão' AS name, 'FWD' AS position, 17 AS jersey_number
  UNION ALL
  SELECT 'POR' AS short_code, 'Pedro Neto' AS name, 'FWD' AS position, 18 AS jersey_number
  UNION ALL
  SELECT 'POR' AS short_code, 'Gonçalo Guedes' AS name, 'FWD' AS position, 19 AS jersey_number
  UNION ALL
  SELECT 'POR' AS short_code, 'João Cancelo' AS name, 'DEF' AS position, 20 AS jersey_number
  UNION ALL
  SELECT 'POR' AS short_code, 'Rúben Neves' AS name, 'MID' AS position, 21 AS jersey_number
  UNION ALL
  SELECT 'POR' AS short_code, 'Rui Silva' AS name, 'GK' AS position, 22 AS jersey_number
  UNION ALL
  SELECT 'POR' AS short_code, 'Vitinha' AS name, 'MID' AS position, 23 AS jersey_number
  UNION ALL
  SELECT 'POR' AS short_code, 'Samú Costa' AS name, 'DEF' AS position, 24 AS jersey_number
  UNION ALL
  SELECT 'POR' AS short_code, 'Nuno Mendes' AS name, 'DEF' AS position, 25 AS jersey_number
  UNION ALL
  SELECT 'POR' AS short_code, 'Francisco Conceição' AS name, 'FWD' AS position, 26 AS jersey_number
  UNION ALL
  SELECT 'UZB' AS short_code, 'Utkir Yusupov' AS name, 'GK' AS position, 1 AS jersey_number
  UNION ALL
  SELECT 'UZB' AS short_code, 'Abdukodir Khusanov' AS name, 'DEF' AS position, 2 AS jersey_number
  UNION ALL
  SELECT 'UZB' AS short_code, 'Khojiakbar Alijonov' AS name, 'DEF' AS position, 3 AS jersey_number
  UNION ALL
  SELECT 'UZB' AS short_code, 'Farrukh Sayfiev' AS name, 'DEF' AS position, 4 AS jersey_number
  UNION ALL
  SELECT 'UZB' AS short_code, 'Rustam Ashurmatov' AS name, 'DEF' AS position, 5 AS jersey_number
  UNION ALL
  SELECT 'UZB' AS short_code, 'Akmal Mozgovoy' AS name, 'MID' AS position, 6 AS jersey_number
  UNION ALL
  SELECT 'UZB' AS short_code, 'Otabek Shukurov' AS name, 'MID' AS position, 7 AS jersey_number
  UNION ALL
  SELECT 'UZB' AS short_code, 'Jamshid Iskanderov' AS name, 'MID' AS position, 8 AS jersey_number
  UNION ALL
  SELECT 'UZB' AS short_code, 'Odiljon Hamrobekov' AS name, 'MID' AS position, 9 AS jersey_number
  UNION ALL
  SELECT 'UZB' AS short_code, 'Jaloliddin Masharipov' AS name, 'MID' AS position, 10 AS jersey_number
  UNION ALL
  SELECT 'UZB' AS short_code, 'Oston Urunov' AS name, 'MID' AS position, 11 AS jersey_number
  UNION ALL
  SELECT 'UZB' AS short_code, 'Abduvohid Nematov' AS name, 'GK' AS position, 12 AS jersey_number
  UNION ALL
  SELECT 'UZB' AS short_code, 'Sherzod Nasrullaev' AS name, 'DEF' AS position, 13 AS jersey_number
  UNION ALL
  SELECT 'UZB' AS short_code, 'Eldor Shomurodov' AS name, 'FWD' AS position, 14 AS jersey_number
  UNION ALL
  SELECT 'UZB' AS short_code, 'Umar Eshmurodov' AS name, 'DEF' AS position, 15 AS jersey_number
  UNION ALL
  SELECT 'UZB' AS short_code, 'Botirali Ergashev' AS name, 'GK' AS position, 16 AS jersey_number
  UNION ALL
  SELECT 'UZB' AS short_code, 'Dostonbek Khamdamov' AS name, 'MID' AS position, 17 AS jersey_number
  UNION ALL
  SELECT 'UZB' AS short_code, 'Abdulla Abdullaev' AS name, 'DEF' AS position, 18 AS jersey_number
  UNION ALL
  SELECT 'UZB' AS short_code, 'Azizjon Ganiev' AS name, 'MID' AS position, 19 AS jersey_number
  UNION ALL
  SELECT 'UZB' AS short_code, 'Azizbek Amonov' AS name, 'FWD' AS position, 20 AS jersey_number
  UNION ALL
  SELECT 'UZB' AS short_code, 'Igor Sergeev' AS name, 'FWD' AS position, 21 AS jersey_number
  UNION ALL
  SELECT 'UZB' AS short_code, 'Abbosbek Fayzullaev' AS name, 'MID' AS position, 22 AS jersey_number
  UNION ALL
  SELECT 'UZB' AS short_code, 'Sherzod Esanov' AS name, 'MID' AS position, 23 AS jersey_number
  UNION ALL
  SELECT 'UZB' AS short_code, 'Bekhruz Karimov' AS name, 'DEF' AS position, 24 AS jersey_number
  UNION ALL
  SELECT 'UZB' AS short_code, 'Avazbek Ulmasaliev' AS name, 'DEF' AS position, 25 AS jersey_number
  UNION ALL
  SELECT 'UZB' AS short_code, 'Jakhongir Urozov' AS name, 'DEF' AS position, 26 AS jersey_number
  UNION ALL
  SELECT 'CRO' AS short_code, 'Dominik Livaković' AS name, 'GK' AS position, 1 AS jersey_number
  UNION ALL
  SELECT 'CRO' AS short_code, 'Josip Stanišić' AS name, 'DEF' AS position, 2 AS jersey_number
  UNION ALL
  SELECT 'CRO' AS short_code, 'Marin Pongračić' AS name, 'DEF' AS position, 3 AS jersey_number
  UNION ALL
  SELECT 'CRO' AS short_code, 'Joško Gvardiol' AS name, 'DEF' AS position, 4 AS jersey_number
  UNION ALL
  SELECT 'CRO' AS short_code, 'Duje Ćaleta-Car' AS name, 'DEF' AS position, 5 AS jersey_number
  UNION ALL
  SELECT 'CRO' AS short_code, 'Josip Šutalo' AS name, 'DEF' AS position, 6 AS jersey_number
  UNION ALL
  SELECT 'CRO' AS short_code, 'Nikola Moro' AS name, 'MID' AS position, 7 AS jersey_number
  UNION ALL
  SELECT 'CRO' AS short_code, 'Mateo Kovačić' AS name, 'MID' AS position, 8 AS jersey_number
  UNION ALL
  SELECT 'CRO' AS short_code, 'Andrej Kramarić' AS name, 'FWD' AS position, 9 AS jersey_number
  UNION ALL
  SELECT 'CRO' AS short_code, 'Luka Modrić' AS name, 'MID' AS position, 10 AS jersey_number
  UNION ALL
  SELECT 'CRO' AS short_code, 'Ante Budimir' AS name, 'FWD' AS position, 11 AS jersey_number
  UNION ALL
  SELECT 'CRO' AS short_code, 'Ivor Pandur' AS name, 'GK' AS position, 12 AS jersey_number
  UNION ALL
  SELECT 'CRO' AS short_code, 'Nikola Vlašić' AS name, 'MID' AS position, 13 AS jersey_number
  UNION ALL
  SELECT 'CRO' AS short_code, 'Ivan Perišić' AS name, 'FWD' AS position, 14 AS jersey_number
  UNION ALL
  SELECT 'CRO' AS short_code, 'Mario Pašalić' AS name, 'MID' AS position, 15 AS jersey_number
  UNION ALL
  SELECT 'CRO' AS short_code, 'Martin Baturina' AS name, 'MID' AS position, 16 AS jersey_number
  UNION ALL
  SELECT 'CRO' AS short_code, 'Petar Sučić' AS name, 'MID' AS position, 17 AS jersey_number
  UNION ALL
  SELECT 'CRO' AS short_code, 'Kristijan Jakić' AS name, 'DEF' AS position, 18 AS jersey_number
  UNION ALL
  SELECT 'CRO' AS short_code, 'Toni Fruk' AS name, 'MID' AS position, 19 AS jersey_number
  UNION ALL
  SELECT 'CRO' AS short_code, 'Igor Matanović' AS name, 'FWD' AS position, 20 AS jersey_number
  UNION ALL
  SELECT 'CRO' AS short_code, 'Luka Sučić' AS name, 'MID' AS position, 21 AS jersey_number
  UNION ALL
  SELECT 'CRO' AS short_code, 'Luka Vušković' AS name, 'DEF' AS position, 22 AS jersey_number
  UNION ALL
  SELECT 'CRO' AS short_code, 'Dominik Kotarski' AS name, 'GK' AS position, 23 AS jersey_number
  UNION ALL
  SELECT 'CRO' AS short_code, 'Marco Pašalić' AS name, 'FWD' AS position, 24 AS jersey_number
  UNION ALL
  SELECT 'CRO' AS short_code, 'Martin Erlić' AS name, 'DEF' AS position, 25 AS jersey_number
  UNION ALL
  SELECT 'CRO' AS short_code, 'Petar Musa' AS name, 'FWD' AS position, 26 AS jersey_number
  UNION ALL
  SELECT 'ENG' AS short_code, 'Jordan Pickford' AS name, 'GK' AS position, 1 AS jersey_number
  UNION ALL
  SELECT 'ENG' AS short_code, 'Ezri Konsa' AS name, 'DEF' AS position, 2 AS jersey_number
  UNION ALL
  SELECT 'ENG' AS short_code, 'Nico O''Reilly' AS name, 'DEF' AS position, 3 AS jersey_number
  UNION ALL
  SELECT 'ENG' AS short_code, 'Declan Rice' AS name, 'MID' AS position, 4 AS jersey_number
  UNION ALL
  SELECT 'ENG' AS short_code, 'John Stones' AS name, 'DEF' AS position, 5 AS jersey_number
  UNION ALL
  SELECT 'ENG' AS short_code, 'Marc Guéhi' AS name, 'DEF' AS position, 6 AS jersey_number
  UNION ALL
  SELECT 'ENG' AS short_code, 'Bukayo Saka' AS name, 'FWD' AS position, 7 AS jersey_number
  UNION ALL
  SELECT 'ENG' AS short_code, 'Elliot Anderson' AS name, 'MID' AS position, 8 AS jersey_number
  UNION ALL
  SELECT 'ENG' AS short_code, 'Harry Kane' AS name, 'FWD' AS position, 9 AS jersey_number
  UNION ALL
  SELECT 'ENG' AS short_code, 'Jude Bellingham' AS name, 'MID' AS position, 10 AS jersey_number
  UNION ALL
  SELECT 'ENG' AS short_code, 'Marcus Rashford' AS name, 'FWD' AS position, 11 AS jersey_number
  UNION ALL
  SELECT 'ENG' AS short_code, 'Tino Livramento' AS name, 'DEF' AS position, 12 AS jersey_number
  UNION ALL
  SELECT 'ENG' AS short_code, 'Dean Henderson' AS name, 'GK' AS position, 13 AS jersey_number
  UNION ALL
  SELECT 'ENG' AS short_code, 'Jordan Henderson' AS name, 'MID' AS position, 14 AS jersey_number
  UNION ALL
  SELECT 'ENG' AS short_code, 'Dan Burn' AS name, 'DEF' AS position, 15 AS jersey_number
  UNION ALL
  SELECT 'ENG' AS short_code, 'Kobbie Mainoo' AS name, 'MID' AS position, 16 AS jersey_number
  UNION ALL
  SELECT 'ENG' AS short_code, 'Morgan Rogers' AS name, 'MID' AS position, 17 AS jersey_number
  UNION ALL
  SELECT 'ENG' AS short_code, 'Anthony Gordon' AS name, 'FWD' AS position, 18 AS jersey_number
  UNION ALL
  SELECT 'ENG' AS short_code, 'Ollie Watkins' AS name, 'FWD' AS position, 19 AS jersey_number
  UNION ALL
  SELECT 'ENG' AS short_code, 'Noni Madueke' AS name, 'FWD' AS position, 20 AS jersey_number
  UNION ALL
  SELECT 'ENG' AS short_code, 'Eberechi Eze' AS name, 'MID' AS position, 21 AS jersey_number
  UNION ALL
  SELECT 'ENG' AS short_code, 'Ivan Toney' AS name, 'FWD' AS position, 22 AS jersey_number
  UNION ALL
  SELECT 'ENG' AS short_code, 'James Trafford' AS name, 'GK' AS position, 23 AS jersey_number
  UNION ALL
  SELECT 'ENG' AS short_code, 'Reece James' AS name, 'DEF' AS position, 24 AS jersey_number
  UNION ALL
  SELECT 'ENG' AS short_code, 'Djed Spence' AS name, 'DEF' AS position, 25 AS jersey_number
  UNION ALL
  SELECT 'ENG' AS short_code, 'Jarell Quansah' AS name, 'DEF' AS position, 26 AS jersey_number
  UNION ALL
  SELECT 'GHA' AS short_code, 'Lawrence Ati-Zigi' AS name, 'GK' AS position, 1 AS jersey_number
  UNION ALL
  SELECT 'GHA' AS short_code, 'Alidu Seidu' AS name, 'DEF' AS position, 2 AS jersey_number
  UNION ALL
  SELECT 'GHA' AS short_code, 'Caleb Yirenkyi' AS name, 'MID' AS position, 3 AS jersey_number
  UNION ALL
  SELECT 'GHA' AS short_code, 'Jonas Adjetey' AS name, 'DEF' AS position, 4 AS jersey_number
  UNION ALL
  SELECT 'GHA' AS short_code, 'Thomas Partey' AS name, 'MID' AS position, 5 AS jersey_number
  UNION ALL
  SELECT 'GHA' AS short_code, 'Abdul Mumin' AS name, 'DEF' AS position, 6 AS jersey_number
  UNION ALL
  SELECT 'GHA' AS short_code, 'Abdul Fatawu' AS name, 'FWD' AS position, 7 AS jersey_number
  UNION ALL
  SELECT 'GHA' AS short_code, 'Kwasi Sibo' AS name, 'MID' AS position, 8 AS jersey_number
  UNION ALL
  SELECT 'GHA' AS short_code, 'Jordan Ayew' AS name, 'FWD' AS position, 9 AS jersey_number
  UNION ALL
  SELECT 'GHA' AS short_code, 'Brandon Thomas-Asante' AS name, 'FWD' AS position, 10 AS jersey_number
  UNION ALL
  SELECT 'GHA' AS short_code, 'Antoine Semenyo' AS name, 'MID' AS position, 11 AS jersey_number
  UNION ALL
  SELECT 'GHA' AS short_code, 'Joseph Anang' AS name, 'GK' AS position, 12 AS jersey_number
  UNION ALL
  SELECT 'GHA' AS short_code, 'Christopher Bonsu Baah' AS name, 'FWD' AS position, 13 AS jersey_number
  UNION ALL
  SELECT 'GHA' AS short_code, 'Gideon Mensah' AS name, 'DEF' AS position, 14 AS jersey_number
  UNION ALL
  SELECT 'GHA' AS short_code, 'Elisha Owusu' AS name, 'MID' AS position, 15 AS jersey_number
  UNION ALL
  SELECT 'GHA' AS short_code, 'Benjamin Asare' AS name, 'GK' AS position, 16 AS jersey_number
  UNION ALL
  SELECT 'GHA' AS short_code, 'Abdul Rahman Baba' AS name, 'DEF' AS position, 17 AS jersey_number
  UNION ALL
  SELECT 'GHA' AS short_code, 'Jerome Opoku' AS name, 'DEF' AS position, 18 AS jersey_number
  UNION ALL
  SELECT 'GHA' AS short_code, 'Iñaki Williams' AS name, 'FWD' AS position, 19 AS jersey_number
  UNION ALL
  SELECT 'GHA' AS short_code, 'Augustine Boakye' AS name, 'MID' AS position, 20 AS jersey_number
  UNION ALL
  SELECT 'GHA' AS short_code, 'Kojo Peprah Oppong' AS name, 'DEF' AS position, 21 AS jersey_number
  UNION ALL
  SELECT 'GHA' AS short_code, 'Kamaldeen Sulemana' AS name, 'FWD' AS position, 22 AS jersey_number
  UNION ALL
  SELECT 'GHA' AS short_code, 'Derrick Luckassen' AS name, 'DEF' AS position, 23 AS jersey_number
  UNION ALL
  SELECT 'GHA' AS short_code, 'Ernest Nuamah' AS name, 'FWD' AS position, 24 AS jersey_number
  UNION ALL
  SELECT 'GHA' AS short_code, 'Prince Kwabena Adu' AS name, 'FWD' AS position, 25 AS jersey_number
  UNION ALL
  SELECT 'GHA' AS short_code, 'Marvin Senaya' AS name, 'DEF' AS position, 26 AS jersey_number
  UNION ALL
  SELECT 'PAN' AS short_code, 'Luis Mejía' AS name, 'GK' AS position, 1 AS jersey_number
  UNION ALL
  SELECT 'PAN' AS short_code, 'César Blackman' AS name, 'DEF' AS position, 2 AS jersey_number
  UNION ALL
  SELECT 'PAN' AS short_code, 'José Córdoba' AS name, 'DEF' AS position, 3 AS jersey_number
  UNION ALL
  SELECT 'PAN' AS short_code, 'Fidel Escobar' AS name, 'DEF' AS position, 4 AS jersey_number
  UNION ALL
  SELECT 'PAN' AS short_code, 'Edgardo Fariña' AS name, 'DEF' AS position, 5 AS jersey_number
  UNION ALL
  SELECT 'PAN' AS short_code, 'Cristian Martínez' AS name, 'MID' AS position, 6 AS jersey_number
  UNION ALL
  SELECT 'PAN' AS short_code, 'José Luis Rodríguez' AS name, 'MID' AS position, 7 AS jersey_number
  UNION ALL
  SELECT 'PAN' AS short_code, 'Adalberto Carrasquilla' AS name, 'MID' AS position, 8 AS jersey_number
  UNION ALL
  SELECT 'PAN' AS short_code, 'Tomás Rodríguez' AS name, 'FWD' AS position, 9 AS jersey_number
  UNION ALL
  SELECT 'PAN' AS short_code, 'Ismael Díaz' AS name, 'MID' AS position, 10 AS jersey_number
  UNION ALL
  SELECT 'PAN' AS short_code, 'Yoel Bárcenas' AS name, 'MID' AS position, 11 AS jersey_number
  UNION ALL
  SELECT 'PAN' AS short_code, 'César Samudio' AS name, 'GK' AS position, 12 AS jersey_number
  UNION ALL
  SELECT 'PAN' AS short_code, 'Jiovany Ramos' AS name, 'DEF' AS position, 13 AS jersey_number
  UNION ALL
  SELECT 'PAN' AS short_code, 'Carlos Harvey' AS name, 'DEF' AS position, 14 AS jersey_number
  UNION ALL
  SELECT 'PAN' AS short_code, 'Eric Davis' AS name, 'DEF' AS position, 15 AS jersey_number
  UNION ALL
  SELECT 'PAN' AS short_code, 'Andrés Andrade' AS name, 'DEF' AS position, 16 AS jersey_number
  UNION ALL
  SELECT 'PAN' AS short_code, 'José Fajardo' AS name, 'FWD' AS position, 17 AS jersey_number
  UNION ALL
  SELECT 'PAN' AS short_code, 'Cecilio Waterman' AS name, 'FWD' AS position, 18 AS jersey_number
  UNION ALL
  SELECT 'PAN' AS short_code, 'Alberto Quintero' AS name, 'MID' AS position, 19 AS jersey_number
  UNION ALL
  SELECT 'PAN' AS short_code, 'Aníbal Godoy' AS name, 'MID' AS position, 20 AS jersey_number
  UNION ALL
  SELECT 'PAN' AS short_code, 'César Yanis' AS name, 'MID' AS position, 21 AS jersey_number
  UNION ALL
  SELECT 'PAN' AS short_code, 'Orlando Mosquera' AS name, 'GK' AS position, 22 AS jersey_number
  UNION ALL
  SELECT 'PAN' AS short_code, 'Michael Amir Murillo' AS name, 'DEF' AS position, 23 AS jersey_number
  UNION ALL
  SELECT 'PAN' AS short_code, 'Azarias Londoño' AS name, 'FWD' AS position, 24 AS jersey_number
  UNION ALL
  SELECT 'PAN' AS short_code, 'Roderick Miller' AS name, 'DEF' AS position, 25 AS jersey_number
  UNION ALL
  SELECT 'PAN' AS short_code, 'Jorge Gutiérrez' AS name, 'DEF' AS position, 26 AS jersey_number
) p
JOIN `wc_teams` t ON t.short_code = p.short_code;

-- =====================================================================
-- VERIFY:
--   SELECT COUNT(*) FROM wc_players;
--   SELECT t.name, COUNT(p.id) c FROM wc_teams t
--     LEFT JOIN wc_players p ON p.team_id=t.id GROUP BY t.id ORDER BY t.id;
-- =====================================================================