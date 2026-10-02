<?php
/**
 * Shared audience → SQL filter on the `client` table (alias c).
 *
 * audience:
 *   all       every non-discontinued client (includes app-only users)
 *   active    profileActiveFlag = 'enable'
 *   inactive  profileActiveFlag = 'disable'   (e.g. "come back" offers)
 *   male      active + gender male
 *   female    active + gender female
 *   client    single client id (audience_value)
 *
 * Returns array(whereSql, params) or null for an invalid audience.
 */
function push_audience_filter($audience, $value) {
    $base = "c.discontinue != 'true'";
    switch ($audience) {
        case 'all':
            return array($base, array());
        case 'active':
            return array($base . " AND c.profileActiveFlag = 'enable'", array());
        case 'inactive':
            return array($base . " AND c.profileActiveFlag = 'disable'", array());
        case 'male':
        case 'female':
            return array($base . " AND c.profileActiveFlag = 'enable' AND LOWER(c.gender) = ?", array($audience));
        case 'client':
            $id = (int)$value;
            if ($id <= 0) return null;
            return array("c.id = ?", array($id));
    }
    return null;
}
?>
