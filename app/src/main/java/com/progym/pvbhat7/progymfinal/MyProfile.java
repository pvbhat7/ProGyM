package com.progym.pvbhat7.progymfinal;

import android.os.Bundle;
import android.support.v7.app.AppCompatActivity;
import android.widget.TextView;

import com.google.firebase.auth.FirebaseAuth;
import com.google.firebase.auth.FirebaseUser;

public class MyProfile extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_my_profile);
        TextView fname = (TextView)findViewById(R.id.Fname);
        final FirebaseUser user = FirebaseAuth.getInstance().getCurrentUser();
        System.out.println("&*&*&*&*&***& "+user.getEmail());
        new MyProfileActivity(this,fname,user.getEmail()).execute(user.getEmail());



    }
}
