package com.progym.pvbhat7.progymfinal;

import android.content.Intent;
import android.os.Bundle;
import android.support.v7.app.AppCompatActivity;
import android.view.View;
import android.widget.Button;

public class Builder extends AppCompatActivity {

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_builder);
        Button chest =(Button)findViewById(R.id.chest);
        Button shouder =(Button)findViewById(R.id.shoulder);
        Button biceps =(Button)findViewById(R.id.biceps);
        Button triceps =(Button)findViewById(R.id.triceps);
        //Button lats =(Button)findViewById(R.id.lats);
        //Button squats =(Button)findViewById(R.id.squats);
        Button abs =(Button)findViewById(R.id.abs);



        chest.setOnClickListener(new View.OnClickListener()
        {
            @Override
            public void onClick(View v) {
                Intent myIntent = new Intent(getApplicationContext(),Chest_Tabs.class);
                startActivity(myIntent);
            }
        });
        shouder.setOnClickListener(new View.OnClickListener()
        {
            @Override
            public void onClick(View v) {
                Intent myIntent = new Intent(getApplicationContext(),Shoulder_Tabs.class);
                startActivity(myIntent);
            }
        });
        biceps.setOnClickListener(new View.OnClickListener()
        {
            @Override
            public void onClick(View v) {
                Intent myIntent = new Intent(getApplicationContext(),Biceps_Tabs.class);
                startActivity(myIntent);
            }
        });
        triceps.setOnClickListener(new View.OnClickListener()
        {
            @Override
            public void onClick(View v) {
                Intent myIntent = new Intent(getApplicationContext(),Triceps_Tabs.class);
                startActivity(myIntent);
            }
        });
        /*lats.setOnClickListener(new View.OnClickListener()
        {
            @Override
            public void onClick(View v) {
                Intent myIntent = new Intent(getApplicationContext(),Lats_Tabs.class);
                startActivity(myIntent);
            }
        });
        squats.setOnClickListener(new View.OnClickListener()
        {
            @Override
            public void onClick(View v) {
                Intent myIntent = new Intent(getApplicationContext(),Squats_Tabs.class);
                startActivity(myIntent);
            }
        });*/
        abs.setOnClickListener(new View.OnClickListener()
        {
            @Override
            public void onClick(View v) {
                Intent myIntent = new Intent(getApplicationContext(),Abs_Tabs.class);
                startActivity(myIntent);
            }
        });

    }
}
