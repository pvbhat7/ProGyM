package com.progym.pvbhat7.progymfinal;

import android.os.Bundle;
import android.support.v7.app.AppCompatActivity;
import android.view.View;
import android.widget.Button;
import android.widget.EditText;
import android.widget.TextView;

public class CreateDiscount extends AppCompatActivity {

    String flag="";
    Button redeemCode;
    TextView discount;
    private EditText enteredCode;
    int discountcode=-1;
    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_create_discount);

        redeemCode= (Button)findViewById(R.id.redeemcode);
        discount = (TextView)findViewById(R.id.discount);
        enteredCode = (EditText) findViewById(R.id.enteredcode);


        redeemCode.setOnClickListener(new View.OnClickListener()
        {
            @Override
            public void onClick(View v)
            {
                String email = enteredCode.getText().toString();
                String arr[]={"K3ER9","Z8WQP","K4MF8","D4RG7","B7DF2","S0DF8","B4BFT","M1DL4","L3RP5","D9OPT","V9DQ4","F7EE4"};
                int discount_ints[]={70,80,95,100,105,85,95,100,110,120,105,85};

                for(int i=0;i<arr.length;i++)
                {
                    if(email.equalsIgnoreCase(arr[i]))
                    {
                        discountcode=i;
                    }

                }

                if(discountcode==-1)
                {
                    discount.setText("Rs. 0 /-");

                }
                else
                {
                    discount.setText("Rs. "+discount_ints[discountcode]+" /-");
                }



            }
        });

    }
}
