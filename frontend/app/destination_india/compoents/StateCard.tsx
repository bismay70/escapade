import { Card } from '@/components/ui/card'
import React from 'react'

interface StateCardProps {
    name: string;
    description: string;
    image: string;
}

const StateCard = ({ name, description, image }: StateCardProps) => {
    return (
        <Card style={{ backgroundImage: `url(${image})`, backgroundSize: 'cover', backgroundPosition: 'center', backgroundRepeat: 'no-repeat' }} className='w-full h-[420px] flex justify-center items-center rounded-3xl shadow-none'>
            <div className='flex flex-col justify-center max-w-sm gap-4 h-full'>
                <h2 className='text-5xl font-bold text-black font-gilroy-medium'>{name}</h2>
                <p className='text-black font-gilroy-medium'>{description}</p>
                <button className='bg-primary-orange text-white px-8 py-3 rounded-lg font-gilroy-medium hover:bg-black hover:text-primary-orange transition-colors w-fit'>
                    Explore {name}
                </button>
            </div>
        </Card>
    )
}

export default StateCard