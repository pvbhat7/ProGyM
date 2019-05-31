-- phpMyAdmin SQL Dump
-- version 4.7.6
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Jan 06, 2018 at 04:27 PM
-- Server version: 10.1.29-MariaDB
-- PHP Version: 7.0.26

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
SET AUTOCOMMIT = 0;
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `id3357824_my_db`
--

-- --------------------------------------------------------

--
-- Table structure for table `appupdate`
--

CREATE TABLE `appupdate` (
  `flag` varchar(20) COLLATE utf8_unicode_ci NOT NULL,
  `app_version` varchar(20) COLLATE utf8_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Dumping data for table `appupdate`
--

INSERT INTO `appupdate` (`flag`, `app_version`) VALUES
('true', '12.6');

-- --------------------------------------------------------

--
-- Table structure for table `Coupons`
--

CREATE TABLE `Coupons` (
  `coupon` varchar(40) COLLATE utf8_unicode_ci NOT NULL,
  `email` varchar(30) COLLATE utf8_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Dumping data for table `Coupons`
--

INSERT INTO `Coupons` (`coupon`, `email`) VALUES
('JJJJJ', 'j@j.com'),
('X8D4L', 'bhatprashant1994@gmail.com'),
('LLD5P', 'k@k.com'),
('LLD5P', 'k@k.com'),
('LLD5P', 'k@k.com'),
('LLD5P', 'k@k.com'),
('LLD5P', 'k@k.com'),
('LLD5P', 'k@k.com'),
('LLD5P', 'patilpranav77d@gmail.com'),
('LLD5P', 'k@k.com'),
('LLD5P', 'k@k.com'),
('LLD5P', 'k@k.com'),
('Z8WQP', 'patil@gmail.com'),
('B4BFT', 'as@s.com'),
('B4BFT', 'q@q.com'),
('B4BFT', 'fh@s.com'),
('B4BFT', 'fh@s.com'),
('B4BFT', 'fh@s.com'),
('B4BFT', 'octuser@gmail.com'),
('B4BFT', 'octuser@gmail.com'),
('B4BFT', 'akash@gmail.com'),
('B4BFT', 'sonya@gmail.com'),
('B7DF2', 'amolgore007@gmail.com'),
('B4BFT', 'sonya@gmail.com'),
('B4BFT', 'mansing3021@gmail.com'),
('S0DF8', 'akashpatil@gmail.com'),
('YU0L4', 'patilpranav77d@gmail.com'),
('F7EE4', 'akhileshjadhav9822@gmail.com'),
('LLD5P', 'poojabhat03326@gmail.com'),
('LLD5P', 'dipti.kumbhar65@gmail.com'),
('F7EE4', 'akhileshjadhav9822@gmail.com'),
('V9DQ4', 'ashitosh578@gmail.com'),
('B4BFT', 'mansing3021@gmail.com'),
('B4BFT', 'mansing3021@gmail.com'),
('LLD5P', 'octuser@gmail.com'),
('M1DL4', 'kdesai17@gmail.com'),
('YU0L4', 'patilpranav77d@gmail.com'),
('MK3LL', 'pankajmanungade@gmail.xom'),
('MK3LL', 'pankajmanungade@gmail.xom'),
('MK3LL', 'pankajmanungade@gmail.xom'),
('V9DQ4', 'ganeshkamble5979@gmail.com'),
('K4MF8', 'akash.desai5220@gmail.com'),
('MK3LL', 'pankajmanungade@gmail.xom'),
('YU0L4', 'patilpranav77d@gmail.com'),
('YU0L4', 'patilpranav77d@gmail.com'),
('V9DQ4', 'atul21081987@gmail.com'),
('LLD5P', 'hrishikesh1998@gmail.com'),
('Z8WQP', 'nikhil741993@gmail.com'),
('YU0L4', 'patilpranav77d@gmail.com'),
('V9DQ4', 'ganeshkamble5979@gmail.com'),
('G9KE6', 'octuser@gmail.com'),
('G9KE6', 'octuser@gmail.com'),
('K3ER9', 'nilmastud6@gmail.com');

-- --------------------------------------------------------

--
-- Table structure for table `heroes`
--

CREATE TABLE `heroes` (
  `id` int(11) NOT NULL,
  `name` varchar(200) COLLATE utf8_unicode_ci NOT NULL,
  `realname` varchar(200) COLLATE utf8_unicode_ci NOT NULL,
  `rating` int(11) NOT NULL,
  `teamaffiliation` varchar(100) COLLATE utf8_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Dumping data for table `heroes`
--

INSERT INTO `heroes` (`id`, `name`, `realname`, `rating`, `teamaffiliation`) VALUES
(6, 'psmp', 'psmp', 5, 'Avengers');

-- --------------------------------------------------------

--
-- Table structure for table `progymwall`
--

CREATE TABLE `progymwall` (
  `id` int(11) NOT NULL,
  `email` varchar(30) COLLATE utf8_unicode_ci NOT NULL,
  `message` varchar(500) COLLATE utf8_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Dumping data for table `progymwall`
--

INSERT INTO `progymwall` (`id`, `email`, `message`) VALUES
(26, 'patilpranav77d@gmail.com', 'Hello everyone,welcome to progym chat wall'),
(27, 'sujaybhosale9636@gmail.com', 'Thanks bhai'),
(28, 'bhatprashant1994@gmail.com', 'Thanks bhavaaa'),
(29, 'akash.desai5220@gmail.com', 'Nice one pranav da'),
(30, 'patil@gmail.com', 'nice app & gym guys !!!'),
(31, 'octuser@gmail.com', 'waiting for 1st Jan,2018'),
(32, 'akash@gmail.com', 'same 2 u bro :)'),
(33, 'octuser@gmail.com', ':)'),
(34, 'akash@gmail.com', 'bhava'),
(35, 'patilpranav77d@gmail.com', 'kay kay'),
(36, 'patilpranav77d@gmail.com', 'kay kay'),
(37, 'patilpranav77d@gmail.com', 'kay kay'),
(47, 'sonya@gmail.com', 'bol ke re'),
(48, 'patilpranav77d@gmail.com', 'boltyat'),
(49, 'sonya@gmail.com', 'hii'),
(59, 'mansing3021@gmail.com', 'hi'),
(67, 'patilpranav77d@gmail.com', 'hi'),
(68, 'patilpranav77d@gmail.com', 'hi'),
(69, 'akashpatil@gmail.com', 'hello all'),
(70, 'sandeepc4917@gmail.com', 'hello'),
(82, 'akash.desai5220@gmail.com', 'ewwww'),
(100, 'akhileshjadhav9822@gmail.com', 'ak no. app'),
(106, 'akash.desai5220@gmail.com', 'hi'),
(107, 'akash.desai5220@gmail.com', 'happy new year'),
(108, 'shubham.desai009@gmail.com', 'hiii'),
(109, 'octuser@gmail.com', 'happy new year bhailog'),
(110, 'octuser@gmail.com', 'hello'),
(112, 'akash.desai5220@gmail.com', 'hi'),
(113, 'swapn999dream@gmail.com', 'Gm'),
(115, 'ganeshkamble5979@gmail.com', 'hi'),
(132, 'nitika293@gmail.com', 'hi'),
(133, 'nitika293@gmail.com', 'hi'),
(134, 'nitika293@gmail.com', 'hi'),
(135, 'nitika293@gmail.com', 'hi'),
(136, 'nitika293@gmail.com', 'hi'),
(137, 'nitika293@gmail.com', 'hi'),
(138, 'nitika293@gmail.com', 'hi'),
(139, 'nitika293@gmail.com', 'hi'),
(140, 'octuser@gmail.com', 'hello nitika'),
(141, 'patresangeeta@gamil.com', 'hii'),
(142, 'patresangeeta@gamil.com', 'hii'),
(143, 'patresangeeta@gamil.com', 'hii'),
(144, 'patresangeeta@gamil.com', 'hii'),
(145, 'patresangeeta@gamil.com', 'hii'),
(146, 'patresangeeta@gamil.com', 'hii'),
(147, 'patresangeeta@gamil.com', 'hii');

-- --------------------------------------------------------

--
-- Table structure for table `referralEntry`
--

CREATE TABLE `referralEntry` (
  `r_email` varchar(30) COLLATE utf8_unicode_ci NOT NULL,
  `referralCode` varchar(30) COLLATE utf8_unicode_ci NOT NULL,
  `deviceId` varchar(30) COLLATE utf8_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Dumping data for table `referralEntry`
--

INSERT INTO `referralEntry` (`r_email`, `referralCode`, `deviceId`) VALUES
('j@j.com', 'oct786', 'f26f9ad2c14d046a'),
('patil@gmail.com', 'oct786', 'f26f9ad2c14d046a'),
('q@q.com', 'al89s', 'f26f9ad2c14d046a'),
('fh@s.com', 'lla89f', 'f26f9ad2c14d046a'),
('akash@gmail.com', 'oct786', 'f26f9ad2c14d046a'),
('sujay7@gmail.com', 'LU98L', 'f26f9ad2c14d046a'),
('sonya@gmail.com', 'pat724', 'f26f9ad2c14d046a'),
('akashpatil@gmail.com', 'oct786', 'f26f9ad2c14d046a'),
('akhileshjadhav9822@gmail.com', '5112', '94a15cae600f5bcb'),
('avadhutmane3043@gmail.com', '03', '83663c266e3c07fb'),
('poojabhat03326@gmail.com', '12345678', 'b9f84802d99c81de'),
('dipti.kumbhar65@gmail.com', 'oct786', 'ca0a56d1a87fd18a'),
('rowldanz@gmail.com', 'sandip', 'c22190be31c19c91'),
('bebejancel@yahoo.com', 'Cel', '2afb8212bb955e99'),
('ashitosh578@gmail.com', '7083186957', 'c36439215df24b10'),
('audumbar97@gmail.com', '@udu7797', '36804d65ad95b54a'),
('abhiambupe007@gmail.com', 'automobile', 'd6a7a922602e0b73'),
('pratikharlikar3331@gmail.com', 'Snehal@143', '144f5c50a66899e8'),
('deuskaryr98@gmail.com', 'yogi.d98', 'faad348e78ca1d75'),
('Hrishikesh1998@gmail.com', '7028132398', 'a5135a0328835c9a'),
('dhruw03051985@gmail.com', 'Teekaram123@', '77539369bbd22799'),
('bapanayya.m@gmail.com', 'rajeswari1', '938f4e9b0763b504'),
('rajivmira2121@gmail.com', '451121', '6a2d578c92f9308c');

-- --------------------------------------------------------

--
-- Table structure for table `table1`
--

CREATE TABLE `table1` (
  `Username` char(30) COLLATE utf8_unicode_ci DEFAULT NULL,
  `Password` char(30) COLLATE utf8_unicode_ci DEFAULT NULL,
  `Role` char(30) COLLATE utf8_unicode_ci DEFAULT NULL,
  `Fname` varchar(30) COLLATE utf8_unicode_ci NOT NULL,
  `Lname` varchar(30) COLLATE utf8_unicode_ci NOT NULL,
  `Email` varchar(30) COLLATE utf8_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Dumping data for table `table1`
--

INSERT INTO `table1` (`Username`, `Password`, `Role`, `Fname`, `Lname`, `Email`) VALUES
('admin', 'admin', 'prashant', 'Prashant', 'Bhat', 'z@z.com');

-- --------------------------------------------------------

--
-- Table structure for table `Users`
--

CREATE TABLE `Users` (
  `id` int(11) NOT NULL,
  `email` varchar(40) COLLATE utf8_unicode_ci NOT NULL,
  `password` varchar(30) COLLATE utf8_unicode_ci NOT NULL,
  `walletmoney` varchar(30) COLLATE utf8_unicode_ci NOT NULL,
  `status` varchar(30) COLLATE utf8_unicode_ci NOT NULL,
  `referralcode` varchar(30) COLLATE utf8_unicode_ci NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8 COLLATE=utf8_unicode_ci;

--
-- Dumping data for table `Users`
--

INSERT INTO `Users` (`id`, `email`, `password`, `walletmoney`, `status`, `referralcode`) VALUES
(22, 'octuser@gmail.com', 'oooooo', '100', 'active', 'oct786'),
(23, 'roshanbhavsar3543@gmail.com', 'pppppp', '100', 'active', 'ros835'),
(24, '15vivek9ec16@gmail.com', 'pppppp', '100', 'active', '12v75'),
(25, 'patilpranav77d@gmail.com', 'pppppp', '100', 'active', 'pat724'),
(26, 'akashdesai5220@gmail.com', 'pppppp', '100', 'active', 'aka845'),
(27, 'shubham.desai009@gmail.com', 'pppppp', '100', 'active', 'shu735'),
(28, 'bceprem.bikki@gmail.com', 'pppppp', '100', 'active', 'bce903'),
(29, 'bhat.vicky39@gmail.com', 'pppppp', '100', 'active', 'bha861'),
(30, 'uutkarshpatil78@gmail.com', 'pppppp', '100', 'active', 'uut847'),
(31, 'akash.desai5220@gmail.com', 'pppppp', '100', 'active', 'aka893'),
(32, 'drsushama.patil134@gmail.com', 'pppppp', '100', 'active', 'drs937'),
(33, 'abhimali1051994@gmail.com', 'pppppp', '100', 'active', 'abh745'),
(34, 'ludatrick@gmail.com', 'pppppp', '100', 'active', 'lud821'),
(35, 'abhishekpawar3232@gmail.com', 'pppppp', '100', 'active', 'abh834'),
(36, 'sujaybhosale9636@gmail.com', 'pppppp', '100', 'active', 'suj932'),
(37, 'aaryanthombare@gmail.com', 'pppppp', '100', 'active', 'aar478'),
(38, 'nikhilpajai9119@gmail.com', 'pppppp', '100', 'active', 'nik777'),
(39, 'skyboyakash15@gmail.com', 'pppppp', '100', 'active', 'sky823'),
(40, 'r8421969694@gmail.com', 'pppppp', '100', 'active', 'r84572'),
(41, 'sourabhvadangekar@gmail.com', 'pppppp', '100', 'active', 'sou824'),
(42, 'shivrajbhoite61@gmail.com', 'pppppp', '100', 'active', 'shi947'),
(43, 'msarse@gmail.com', 'pppppp', '100', 'active', 'msa866'),
(44, 'shreemat07@gmail.com', 'pppppp', '100', 'active', 'shr834'),
(45, 'aniketkatawate@gmail.com', 'pppppp', '100', 'active', 'ani845'),
(46, 'akshaydoiphode2016@gmail.com', 'pppppp', '100', 'active', 'aks935'),
(47, 'abhinandanshirke07@gmail.com', 'pppppp', '100', 'active', 'abh419'),
(48, 'varunadon75@gmail.com', 'pppppp', '100', 'active', 'var999'),
(49, 'lalit.kaushik173@gmail.com', 'pppppp', '100', 'active', 'lal230'),
(50, 'rajajafar390@gmail.com', 'pppppp', '100', 'active', 'raj294'),
(51, 'msarse@gmail.com', 'pppppp', '100', 'active', 'msa866'),
(52, 'bhoite1213@gmail.com', 'pppppp', '100', 'active', 'bho740'),
(53, 'shirkesuraj29@gmail.com', 'pppppp', '100', 'active', 'shi729'),
(54, 'sirajshaikh2024@gmail.com', 'pppppp', '100', 'active', 'sir749'),
(55, 'krish.harsh13@gmail.com', 'pppppp', '100', 'active', 'kri747'),
(56, 'gopalr791@gmail.com', 'pppppp', '100', 'active', 'gop345'),
(57, 'rangraochavan1216@gmail.com', 'pppppp', '100', 'active', 'ran822'),
(58, 'shahrukhnadaf2017@gmail.com', 'pppppp', '100', 'active', 'sha232'),
(59, 'shivrajkamate60@gmail.com', 'pppppp', '100', 'active', 'shi767'),
(60, 'aniketpatil11271127@gmail.com', 'pppppp', '100', 'active', 'ani639'),
(61, 'vishnuak57000@gmail.com', 'pppppp', '100', 'active', 'vis929'),
(62, 'chauhanvikas424@gmail.com', 'pppppp', '100', 'active', 'cha728'),
(63, 'ganeshdighole123@gmail.com', 'pppppp', '100', 'active', 'gan211'),
(64, 'vishal.s707.vp@gmail.com', 'pppppp', '100', 'active', 'vis887'),
(65, 'ganeshdighole123@gmail.com', 'pppppp', '100', 'active', 'gan211'),
(66, 'saintx909x@gmail.com', 'pppppp', '100', 'active', 'sai729'),
(67, 'vishalmisal304@gmail.com', 'pppppp', '100', 'active', 'vis251'),
(68, 'kamnalikhi04@gmail.com', 'pppppp', '100', 'active', 'kam101'),
(69, 'nilesh2201@gmail.com', 'pppppp', '100', 'active', 'nil343'),
(70, 'vanita.bhat7426@gmail.com', 'pppppp', '100', 'active', 'van838'),
(71, 'nitika293@gmail.com', 'pppppp', '100', 'active', 'nit777'),
(72, 'yogshbhat71@gmail.com', 'pppppp', '100', 'active', 'yog920'),
(73, 'vinayak.bhat67@gmail.com', 'pppppp', '100', 'active', 'vin555'),
(74, 'swapnilpajai9119@gmail.com', 'pppppp', '100', 'active', 'swa815'),
(75, 'sahil199611@gmail.com', 'pppppp', '100', 'active', 'sah835'),
(76, 'chavanchandrakant8@gmail.com', 'pppppp', '100', 'active', 'din978'),
(77, 'bhat.vicky3@gmail.com', 'pppppp', '100', 'active', 'bha834'),
(78, 'iamprobir.shaw@gmail.com', 'pppppp', '100', 'active', 'iam923'),
(79, 'mansing3011@gmail.com', 'pppppp', '100', 'active', 'man906'),
(80, 'mansing3021@gmail.com', 'pppppp', '100', 'active', 'man321'),
(81, 'rapolumanikumar@gmail.com', 'pppppp', '100', 'active', 'rap945'),
(82, 'advocatesarang@gmail.com', 'pppppp', '100', 'active', 'adv922'),
(83, 'rajarajan73586@gmail.com', 'pppppp', '100', 'active', 'raj233'),
(93, 'akash@gmail.com', 'aaaaaa', '150', 'active', 'aka513'),
(94, 'sujay7@gmail.com', 'ssssss', '150', 'active', 'suj643'),
(95, 'sonya@gmail.com', 'ssssss', '150', 'active', 'son546'),
(96, 'meeravalishaik16@gmail.com', 'meeru786', '150', 'active', 'mee314'),
(97, 'amolgore007@gmail.com', 'Invoker', '150', 'active', 'amo567'),
(98, 'drsabeer80@gmail.com', 'ibaad123', '150', 'active', 'drs754'),
(99, 'samkitadeep@gmail.com', '9424066023', '150', 'active', 'sam751'),
(100, 'ratnadeepk17@gmail.com\r\n', 'rrrrrr', '150', 'active', 'rat932'),
(101, 'shashnkame8@gmail.com\r\n', 'ssssss', '150', 'active', 'sha823'),
(102, 'akashpatil@gmail.com', 'aaaaaa', '150', 'active', 'aka423'),
(103, 'sandeepc4917@gmail.com', 'Sandeep7979', '100', 'active', 'san454'),
(104, 'agskxmn@gmail.com', 'armankhan', '100', 'active', 'ags444'),
(105, 'sumanreddytekula2342@gmail.com', 'bandamylove', '100', 'active', 'sum175'),
(106, 'memayurshinde77@gmail.com', '7385126874', '100', 'active', 'mem283'),
(107, 'akhileshjadhav9822@gmail.com', '9822865380', '150', 'active', 'akh822'),
(108, 'avadhutmane3043@gmail.com', 'avadhut@0+', '125', 'active', 'ava167'),
(109, 'poojabhat03326@gmail.com', 'poojabhat', '125', 'active', 'poo356'),
(110, 'rbhat90.rb@gmail.com', 'galvatron', '100', 'active', 'rbh665'),
(111, 'kdesai17@gmail.com', '8149635953', '100', 'active', 'kde33'),
(112, 'dipti.kumbhar65@gmail.com', 'dipti5887', '100', 'active', 'dip754'),
(113, 'rowldanz@gmail.com', 'sandip', '100', 'active', 'row246'),
(114, 'dpdigu@gmail.com', 'digu2534', '100', 'active', 'dpd215'),
(115, 'bebejancel@yahoo.com', 'newnew123', '100', 'active', 'beb854'),
(116, 'ashitosh578@gmail.com', 'ashutoshpatil', '100', 'active', 'ash354'),
(117, 'audumbar97@gmail.com', '@udu7797', '100', 'active', 'aud841'),
(118, 'abhiambupe007@gmail.com', 'automobile', '100', 'active', 'abh347'),
(119, 'ajaypartapsingh223@gmail.com', '9463394884', '100', 'active', 'aja765'),
(120, 'deepsinghdevra97@gmail.com8890', 'niitifbi@12345', '100', 'active', 'dee176'),
(121, 'satukdm1220@gmail.com', '8657469696', '100', 'active', 'sat156'),
(122, 'atul21081987@gmail.com', 'Atul@2108', '100', 'active', 'atu648'),
(123, 'vaibhavkulkarni8995@gmail.com', '123456', '100', 'active', 'vai232'),
(124, 'ganeshkamble5979@gmail.com', '9975252624', '100', 'active', 'gan133'),
(125, 'pankajmanungade@gmail.xom', '9158098695', '100', 'active', 'pan266'),
(126, 'pratikharlikar3331@gmail.com', 'snehal@143', '100', 'active', 'pra117'),
(127, 'swapn999dream@gmail.com', '9850016612', '100', 'active', 'swa438'),
(128, 'pankajmanungade@gmail.com', '9158098695', '100', 'active', 'pan124'),
(129, 'surajmahekar46001@gmail.com', '7709444810', '100', 'active', 'sur881'),
(130, 'deuskaryr98@gmail.com', 'kalandarsare', '100', 'active', 'deu834'),
(131, 'nikhil741993@gmail.com', 'jackiechan', '100', 'active', 'nik455'),
(132, 'rahultivale26@gmail.com', '9834903454', '100', 'active', 'rah733'),
(133, 'savantshreya3040@gmail.com', '9011363840', '100', 'active', 'sav488'),
(134, 'nomisii@hotmail.com', '6e1phucx', '100', 'active', 'nom462'),
(135, 'Hrishikesh1998@gmail.com', '9096831893', '100', 'active', 'Hri652'),
(136, 'lokesho.kanna@gmail.com', 'loke123', '100', 'active', 'lok457'),
(137, 'jithinkumarpanambra8861@gmail.com', 'jith9345', '100', 'active', 'jit367'),
(138, 'windy006@gmail.com', 'nhatrang12', '100', 'active', 'win381'),
(139, 'careers.kaushal@gmail.com', 'manjul123', '100', 'active', 'car125'),
(140, 'dhruw03051985@gmail.com', 'teekaram113@', '100', 'active', 'dhr811'),
(141, 'khantahi.com@gmail.com', 'ta90h1ir8', '100', 'active', 'kha422'),
(142, 'bapanayya.m@gmail.com', 'rakeswari1', '100', 'active', 'bap634'),
(143, '55deepakjat4566@gmail.com', 'chaudhary@12', '100', 'active', '55d471'),
(144, 'girishkarale5757@gmail.com', '8788670970', '100', 'active', 'gir352'),
(145, 'shirishshinde124@gmail.com', '9657784001', '100', 'active', 'shi733'),
(146, 'nilmastud6@gmail.com', '9284476737', '100', 'active', 'nil572'),
(147, 'nwandikocharles@gmai.com', 'mommy1100', '100', 'active', 'nwa238'),
(148, 'bhinang@gmail.com', 'gnanihb', '100', 'active', 'bhi242'),
(149, 'patresangeeta@gamil.com', 'sukhwati', '100', 'active', 'pat571pat487'),
(150, 'tejasbhakare3030@gmail.com', '21071999', '100', 'active', 'tej887'),
(151, 'ksureshkumar1589@gmail.com', 'suresh1589', '100', 'active', 'ksu235'),
(152, 'saurabhstalone@yahoo.com', 'saurabhsv', '100', 'active', 'sau426'),
(153, 'rajivmira2121@gmail.com', '451121', '100', 'active', 'raj263');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `heroes`
--
ALTER TABLE `heroes`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `progymwall`
--
ALTER TABLE `progymwall`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `Users`
--
ALTER TABLE `Users`
  ADD PRIMARY KEY (`id`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `heroes`
--
ALTER TABLE `heroes`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=7;

--
-- AUTO_INCREMENT for table `progymwall`
--
ALTER TABLE `progymwall`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=148;

--
-- AUTO_INCREMENT for table `Users`
--
ALTER TABLE `Users`
  MODIFY `id` int(11) NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=154;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
