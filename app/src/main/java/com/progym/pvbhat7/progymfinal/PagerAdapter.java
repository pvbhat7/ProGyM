package com.progym.pvbhat7.progymfinal;

import android.support.v4.app.Fragment;
import android.support.v4.app.FragmentManager;
import android.support.v4.app.FragmentStatePagerAdapter;

public class PagerAdapter extends FragmentStatePagerAdapter {
    int mNumOfTabs;

    public PagerAdapter(FragmentManager fm, int NumOfTabs) {
        super(fm);
        this.mNumOfTabs = NumOfTabs;
    }

    @Override
    public Fragment getItem(int position) {

        switch (position) {

            case 0:
                OneFragment o1 = new OneFragment();
                return o1;
            case 1:
                TwoFragment o2 = new TwoFragment();
                return o2;
            case 2:
                ThreeFragment o3 = new ThreeFragment();
                return o3;
            case 3:
                FourFragment o4 = new FourFragment();
                return o4;
            case 4:
                FragmentFive o5 = new FragmentFive();
                return o5;

            case 5:
                SixFragment o6 = new SixFragment();
                return o6;

            case 6:
                SevenFragment o7 = new SevenFragment();
                return o7;

            case 7:
                EightFragment o8 = new EightFragment();
                return o8;
            case 8:
                NineFragment o9 = new NineFragment();
                return o9;

            default:
                return null;
        }
    }

    @Override
    public int getCount() {
        return mNumOfTabs;
    }
}