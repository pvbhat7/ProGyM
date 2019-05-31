package com.progym.pvbhat7.progymfinal;


import android.support.v4.app.Fragment;
import android.support.v4.app.FragmentManager;
import android.support.v4.app.FragmentStatePagerAdapter;

public class PagerAdapter_lats extends FragmentStatePagerAdapter {
    int mNumOfTabs;

    public PagerAdapter_lats(FragmentManager fm, int NumOfTabs) {
        super(fm);
        this.mNumOfTabs = NumOfTabs;
    }

    @Override
    public Fragment getItem(int position) {

        switch (position) {

            case 0:
                LATS_front_lats_pull_down o1 = new LATS_front_lats_pull_down();
                return o1;
            case 1:
                LATS_close_grill_pull_downs o2 = new LATS_close_grill_pull_downs();
                return o2;
            case 2:
                LATS_one_arm_cable_row o3 = new LATS_one_arm_cable_row();
                return o3;
            case 3:
                LATS_seated_cable_row o4 = new LATS_seated_cable_row();
                return o4;
            case 4:
                LATS_bentover_barbell_row o5 = new LATS_bentover_barbell_row();
                return o5;

            case 5:
                LATS_dumbell_rows o6 = new LATS_dumbell_rows();
                return o6;

            case 6:
                LATS_pull_ups o7 = new LATS_pull_ups();
                return o7;


            default:
                return null;
        }
    }

    @Override
    public int getCount() {
        return mNumOfTabs;
    }
}