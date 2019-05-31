package com.progym.pvbhat7.progymfinal;


import android.support.v4.app.Fragment;
import android.support.v4.app.FragmentManager;
import android.support.v4.app.FragmentStatePagerAdapter;

public class PagerAdapter_abs extends FragmentStatePagerAdapter {
    int mNumOfTabs;

    public PagerAdapter_abs(FragmentManager fm, int NumOfTabs) {
        super(fm);
        this.mNumOfTabs = NumOfTabs;
    }

    @Override
    public Fragment getItem(int position) {

        switch (position) {

            case 0:
                ABS_leg_raise o1 = new ABS_leg_raise();
                return o1;
            case 1:
                ABS_cross_body_crunches o2 = new ABS_cross_body_crunches();
                return o2;
            case 2:
                ABS_leg_raise o3 = new ABS_leg_raise();
                return o3;
            case 3:
                ABS_jackknives o4 = new ABS_jackknives();
                return o4;
            case 4:
                ABS_oblique_raises o5 = new ABS_oblique_raises();
                return o5;

            case 5:
                ABS_reverse_crunching o6 = new ABS_reverse_crunching();
                return o6;

            case 6:
                ABS_side_bend o7 = new ABS_side_bend();
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